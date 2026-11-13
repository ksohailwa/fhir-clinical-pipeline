import { Router } from "express";
import { z } from "zod";
import { config } from "../config";
import type { RecordService } from "../record/service";
import { sendData, sendError } from "./envelope";

const SearchQuerySchema = z.object({
  name: z.string().trim().min(1, "name is required").max(config.maxNameQueryLength),
});

export const PatientParamsSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9\-.]{1,64}$/, "id is not a valid FHIR id"),
});

export function patientsRouter(records: RecordService): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    const query = SearchQuerySchema.safeParse(req.query);
    if (!query.success) {
      return sendError(res, 400, "BAD_REQUEST", z.prettifyError(query.error));
    }
    sendData(res, await records.searchPatients(query.data.name));
  });

  router.get("/:id/record", async (req, res) => {
    const params = PatientParamsSchema.safeParse(req.params);
    if (!params.success) {
      return sendError(res, 400, "BAD_REQUEST", z.prettifyError(params.error));
    }
    const record = await records.getRecord(params.data.id);
    if (!record) {
      return sendError(res, 404, "NOT_FOUND", `Patient ${params.data.id} not found`);
    }
    sendData(res, record);
  });

  return router;
}
