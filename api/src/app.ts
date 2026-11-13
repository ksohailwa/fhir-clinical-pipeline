import express, { type ErrorRequestHandler } from "express";
import { FhirError } from "./fhir/client";
import { sendData, sendError } from "./http/envelope";
import { patientsRouter } from "./http/patients";
import { summaryRouter } from "./http/summary";
import type { RecordService } from "./record/service";
import { ProviderError } from "./summary/provider";
import type { SummaryService } from "./summary/service";

export type ReadinessCheck = () => Promise<boolean>;

export function createApp(
  records: RecordService,
  summaries: SummaryService | null = null,
  isReady: ReadinessCheck = async () => true,
) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json());

  app.get("/api/health", (_req, res) => sendData(res, { status: "ok" }));
  app.get("/api/ready", async (_req, res) => {
    if (await isReady()) return sendData(res, { status: "ready" });
    sendError(res, 503, "UPSTREAM_UNAVAILABLE", "FHIR server is not ready");
  });
  app.use("/api/patients", patientsRouter(records));
  app.use("/api/patients", summaryRouter(summaries));
  app.use("/api", (_req, res) => sendError(res, 404, "NOT_FOUND", "No such endpoint"));

  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof FhirError) {
      console.error(error.message);
      const code = error.status === 503 ? "UPSTREAM_UNAVAILABLE" : "UPSTREAM_ERROR";
      return sendError(res, error.status, code, "The FHIR server request failed");
    }
    if (error instanceof ProviderError) {
      console.error(error.message);
      return sendError(res, 502, "LLM_FAILED", "The summary could not be generated");
    }
    console.error(error);
    sendError(res, 500, "INTERNAL_ERROR", "Unexpected error");
  };
  app.use(handleError);

  return app;
}
