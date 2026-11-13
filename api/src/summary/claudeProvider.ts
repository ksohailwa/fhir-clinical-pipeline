import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ProviderError, SummaryDraftSchema, type SummaryProvider } from "./provider";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface ClaudeProviderOptions {
  client: Anthropic;
  model: string;
  effort: Effort;
  maxTokens: number;
}

const SERVER_SIDE_FALLBACK_BETA = "server-side-fallback-2026-07-01";

export function createClaudeProvider({
  client,
  model,
  effort,
  maxTokens,
}: ClaudeProviderOptions): SummaryProvider {
  const name = "anthropic";

  return {
    name,
    model,
    async summarize({ system, prompt }) {
      let response;
      try {
        response = await client.beta.messages.parse({
          model,
          max_tokens: maxTokens,
          betas: [SERVER_SIDE_FALLBACK_BETA],
          fallbacks: "default",
          output_config: { effort, format: betaZodOutputFormat(SummaryDraftSchema) },
          system,
          messages: [{ role: "user", content: prompt }],
        });
      } catch (error) {
        if (error instanceof Anthropic.APIError) {
          throw new ProviderError(`API error ${error.status ?? "network"}: ${error.message}`, name);
        }
        throw error;
      }

      if (response.stop_reason === "refusal") {
        throw new ProviderError(
          `Refused (${response.stop_details?.category ?? "uncategorised"})`,
          name,
        );
      }
      if (response.stop_reason === "max_tokens") {
        throw new ProviderError("Response hit max_tokens before finishing", name);
      }
      if (!response.parsed_output) {
        throw new ProviderError("Response did not match the summary schema", name);
      }
      return response.parsed_output;
    },
  };
}
