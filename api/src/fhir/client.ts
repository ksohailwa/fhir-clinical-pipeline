import { z } from "zod";
import { BundleSchema } from "./schemas";

export class FhirError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "FhirError";
  }
}

export interface FhirClientOptions {
  baseUrl: string;
  timeoutMs: number;
  maxPages: number;
  fetchImpl?: typeof fetch;
}

export interface SearchOptions {
  allPages: boolean;
}

export interface FhirClient {
  ping(): Promise<boolean>;
  read<T extends z.ZodType>(type: string, id: string, schema: T): Promise<z.infer<T> | null>;
  search<T extends z.ZodType>(
    type: string,
    params: Record<string, string>,
    schema: T,
    options: SearchOptions,
  ): Promise<z.infer<T>[]>;
}

const FHIR_JSON = "application/fhir+json";

export function createFhirClient({
  baseUrl,
  timeoutMs,
  maxPages,
  fetchImpl = fetch,
}: FhirClientOptions): FhirClient {
  async function getJson(url: string): Promise<{ status: number; body: unknown }> {
    let response: Response;
    try {
      response = await fetchImpl(url, {
        headers: { Accept: FHIR_JSON },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new FhirError(`FHIR server unreachable: ${reason}`, 503);
    }
    if (response.status === 404 || response.status === 410) {
      return { status: response.status, body: null };
    }
    if (!response.ok) {
      throw new FhirError(`FHIR server answered ${response.status}`, 502);
    }
    return { status: response.status, body: await response.json() };
  }

  function parse<T extends z.ZodType>(schema: T, value: unknown, what: string): z.infer<T> {
    const result = schema.safeParse(value);
    if (!result.success) {
      throw new FhirError(`Unexpected FHIR ${what}: ${z.prettifyError(result.error)}`, 502);
    }
    return result.data;
  }

  function assertSameServer(url: string): void {
    if (!url.startsWith(`${baseUrl}`)) {
      throw new FhirError(`Refusing to follow paging link outside ${baseUrl}`, 502);
    }
  }

  return {
    async ping() {
      try {
        const { status, body } = await getJson(`${baseUrl}/metadata`);
        return status === 200 && (body as { resourceType?: unknown })?.resourceType === "CapabilityStatement";
      } catch {
        return false;
      }
    },

    async read(type, id, schema) {
      const { body } = await getJson(`${baseUrl}/${type}/${encodeURIComponent(id)}`);
      return body === null ? null : parse(schema, body, type);
    },

    async search(type, params, schema, { allPages }) {
      const results: z.infer<typeof schema>[] = [];
      let url: string | undefined = `${baseUrl}/${type}?${new URLSearchParams(params)}`;
      for (let page = 0; url; page++) {
        if (page >= maxPages) {
          throw new FhirError(`${type} search exceeded ${maxPages} pages`, 502);
        }
        const { body } = await getJson(url);
        const bundle = parse(BundleSchema, body, "search Bundle");
        for (const entry of bundle.entry ?? []) {
          const resource = entry.resource as { resourceType?: unknown } | undefined;
          if (resource?.resourceType === type) {
            results.push(parse(schema, resource, type));
          }
        }
        url = allPages ? bundle.link?.find((link) => link.relation === "next")?.url : undefined;
        if (url) assertSameServer(url);
      }
      return results;
    },
  };
}
