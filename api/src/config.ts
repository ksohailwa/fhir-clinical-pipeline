import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  FHIR_BASE_URL: z.url().default("http://localhost:8080/fhir"),
  FHIR_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  ANTHROPIC_API_KEY: z.string().trim().optional(),
  SUMMARY_PRIMARY_MODEL: z.string().default("claude-opus-5-5"),
  SUMMARY_FALLBACK_MODEL: z.string().default("claude-sonnet-5-5"),
  SUMMARY_EFFORT: z.enum(["low", "medium", "high", "xhigh", "max"]).default("medium"),
  SUMMARY_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
});

const env = EnvSchema.parse(process.env);

export const config = {
  port: env.PORT,
  fhirBaseUrl: env.FHIR_BASE_URL.replace(/\/+$/, ""),
  fhirTimeoutMs: env.FHIR_TIMEOUT_MS,
  searchPageSize: 20,
  recordPageSize: 200,
  maxPages: 50,
  maxNameQueryLength: 100,
  summary: {
    apiKey: env.ANTHROPIC_API_KEY || undefined,
    primaryModel: env.SUMMARY_PRIMARY_MODEL,
    fallbackModel: env.SUMMARY_FALLBACK_MODEL,
    effort: env.SUMMARY_EFFORT,
    timeoutMs: env.SUMMARY_TIMEOUT_MS,
    maxTokens: 16_000,
    maxSentences: 5,
    maxFailedSentences: 1,
    maxConditionFacts: 40,
    maxLabFacts: 40,
    maxMedicationFacts: 20,
  },
} as const;
