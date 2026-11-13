import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  FHIR_BASE_URL: z.url().default("http://localhost:8080/fhir"),
  FHIR_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
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
} as const;
