import { createFhirClient, FhirError } from "../src/fhir/client";
import { ConditionSchema, PatientSchema } from "../src/fhir/schemas";

const BASE = "http://fhir.test/fhir";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/fhir+json" },
  });
}

function condition(id: string) {
  return { resourceType: "Condition", id, code: { text: id } };
}

function clientWith(responses: Record<string, Response>) {
  const calls: string[] = [];
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    const response = responses[url];
    if (!response) throw new Error(`unexpected ${url}`);
    return response;
  }) as typeof fetch;
  return { calls, client: createFhirClient({ baseUrl: BASE, timeoutMs: 1000, maxPages: 3, fetchImpl }) };
}

describe("search", () => {
  it("follows next links until the last page", async () => {
    const page2 = `${BASE}?_getpages=abc&_getpagesoffset=1`;
    const { client, calls } = clientWith({
      [`${BASE}/Condition?patient=p1`]: jsonResponse({
        resourceType: "Bundle",
        link: [{ relation: "next", url: page2 }],
        entry: [{ resource: condition("c1") }],
      }),
      [page2]: jsonResponse({ resourceType: "Bundle", entry: [{ resource: condition("c2") }] }),
    });
    const results = await client.search("Condition", { patient: "p1" }, ConditionSchema, {
      allPages: true,
    });
    expect(results.map((item) => item.id)).toEqual(["c1", "c2"]);
    expect(calls).toHaveLength(2);
  });

  it("ignores entries of other resource types such as OperationOutcome", async () => {
    const { client } = clientWith({
      [`${BASE}/Condition?patient=p1`]: jsonResponse({
        resourceType: "Bundle",
        entry: [{ resource: condition("c1") }, { resource: { resourceType: "OperationOutcome" } }],
      }),
    });
    const results = await client.search("Condition", { patient: "p1" }, ConditionSchema, {
      allPages: true,
    });
    expect(results).toHaveLength(1);
  });

  it("refuses to follow a next link to another server", async () => {
    const { client } = clientWith({
      [`${BASE}/Condition?patient=p1`]: jsonResponse({
        resourceType: "Bundle",
        link: [{ relation: "next", url: "http://evil.test/fhir?page=2" }],
        entry: [],
      }),
    });
    await expect(
      client.search("Condition", { patient: "p1" }, ConditionSchema, { allPages: true }),
    ).rejects.toThrow(FhirError);
  });

  it("rejects a resource that does not match the schema", async () => {
    const { client } = clientWith({
      [`${BASE}/Condition?patient=p1`]: jsonResponse({
        resourceType: "Bundle",
        entry: [{ resource: { resourceType: "Condition" } }],
      }),
    });
    await expect(
      client.search("Condition", { patient: "p1" }, ConditionSchema, { allPages: true }),
    ).rejects.toMatchObject({ status: 502 });
  });
});

describe("read", () => {
  it("returns null for a missing resource", async () => {
    const { client } = clientWith({ [`${BASE}/Patient/nope`]: jsonResponse({}, 404) });
    await expect(client.read("Patient", "nope", PatientSchema)).resolves.toBeNull();
  });

  it("reports an unreachable server as 503", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    const client = createFhirClient({ baseUrl: BASE, timeoutMs: 1000, maxPages: 3, fetchImpl });
    await expect(client.read("Patient", "p1", PatientSchema)).rejects.toMatchObject({ status: 503 });
  });
});
