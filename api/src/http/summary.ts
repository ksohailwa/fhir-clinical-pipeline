import { Router } from "express";
import { z } from "zod";
import type { SummaryService } from "../summary/service";
import { sendData, sendError } from "./envelope";
import { PatientParamsSchema } from "./patients";

export function summaryRouter(summaries: SummaryService | null): Router {
  const router = Router();

  router.post("/:id/summary", async (req, res) => {
    const params = PatientParamsSchema.safeParse(req.params);
    if (!params.success) {
      return sendError(res, 400, "BAD_REQUEST", z.prettifyError(params.error));
    }
    if (!summaries) {
      return sendError(res, 503, "LLM_NOT_CONFIGURED", "Set ANTHROPIC_API_KEY to enable summaries");
    }
    const summary = await summaries.summarize(params.data.id);
    if (!summary) {
      return sendError(res, 404, "NOT_FOUND", `Patient ${params.data.id} not found`);
    }
    sendData(res, summary);
  });

  return router;
}
