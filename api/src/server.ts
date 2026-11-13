import Anthropic from "@anthropic-ai/sdk";
import { createApp } from "./app";
import { config } from "./config";
import { createFhirClient } from "./fhir/client";
import { createRecordService } from "./record/service";
import { createClaudeProvider } from "./summary/claudeProvider";
import { createSummaryService, type SummaryService } from "./summary/service";

const SDK_MAX_RETRIES = 1;

const fhir = createFhirClient({
  baseUrl: config.fhirBaseUrl,
  timeoutMs: config.fhirTimeoutMs,
  maxPages: config.maxPages,
});
const records = createRecordService(fhir);

function createSummaries(): SummaryService | null {
  const { apiKey, primaryModel, fallbackModel, effort, timeoutMs, maxTokens } = config.summary;
  if (!apiKey) {
    console.warn("ANTHROPIC_API_KEY is not set; POST /api/patients/:id/summary will return 503");
    return null;
  }
  const client = new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: SDK_MAX_RETRIES });
  const providers = [primaryModel, fallbackModel].map((model) =>
    createClaudeProvider({ client, model, effort, maxTokens }),
  );
  return createSummaryService(records, providers, config.summary);
}

createApp(records, createSummaries()).listen(config.port, () => {
  console.log(`API listening on :${config.port}, FHIR at ${config.fhirBaseUrl}`);
});
