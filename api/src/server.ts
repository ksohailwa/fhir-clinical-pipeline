import { createApp } from "./app";
import { config } from "./config";
import { createFhirClient } from "./fhir/client";
import { createRecordService } from "./record/service";

const fhir = createFhirClient({
  baseUrl: config.fhirBaseUrl,
  timeoutMs: config.fhirTimeoutMs,
  maxPages: config.maxPages,
});

createApp(createRecordService(fhir)).listen(config.port, () => {
  console.log(`API listening on :${config.port}, FHIR at ${config.fhirBaseUrl}`);
});
