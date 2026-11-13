import { z } from "zod";

export const SummaryDraftSchema = z.object({
  sentences: z.array(
    z.object({
      text: z.string(),
      citations: z.array(z.string()),
    }),
  ),
});

export type SummaryDraft = z.infer<typeof SummaryDraftSchema>;

export interface SummaryRequest {
  system: string;
  prompt: string;
}

export interface SummaryProvider {
  readonly name: string;
  readonly model: string;
  summarize(request: SummaryRequest): Promise<SummaryDraft>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly provider: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export interface ChainResult {
  draft: SummaryDraft;
  provider: SummaryProvider;
  failures: string[];
}

export async function summarizeWithFallback(
  providers: readonly SummaryProvider[],
  request: SummaryRequest,
): Promise<ChainResult> {
  const failures: string[] = [];
  for (const provider of providers) {
    try {
      return { draft: await provider.summarize(request), provider, failures };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      failures.push(`${provider.name}/${provider.model}: ${reason}`);
    }
  }
  throw new ProviderError(`All providers failed: ${failures.join("; ")}`, "chain");
}
