import request from "supertest";
import { createApp } from "../../src/app";
import { createFhirClient } from "../../src/fhir/client";
import { createRecordService } from "../../src/record/service";
import { CHILDREN, FAMILY_NAME, PATIENTS, transactionBundle } from "./fixtures";

const BASE_URL = process.env.FHIR_INTEGRATION_URL;
const FHIR_JSON = { "Content-Type": "application/fhir+json", Accept: "application/fhir+json" };
const TIMEOUT_MS = 30_000;

const describeIfServer = BASE_URL ? describe : describe.skip;

describeIfServer("record endpoint against a real HAPI FHIR server", () => {
  const baseUrl = BASE_URL!.replace(/\/+$/, "");
  const fhir = createFhirClient({ baseUrl, timeoutMs: TIMEOUT_MS, maxPages: 10 });
  const app = createApp(createRecordService(fhir), null, () => fhir.ping());

  beforeAll(async () => {
    for (const resources of [PATIENTS, CHILDREN]) {
      const response = await fetch(baseUrl, {
        method: "POST",
        headers: FHIR_JSON,
        body: JSON.stringify(transactionBundle(resources)),
      });
      if (!response.ok) throw new Error(`Loading fixtures failed: ${response.status} ${await response.text()}`);
    }
  }, TIMEOUT_MS);

  afterAll(async () => {
    for (const resource of [...CHILDREN, ...PATIENTS]) {
      await fetch(`${baseUrl}/${resource.resourceType}/${resource.id}`, { method: "DELETE" });
    }
  }, TIMEOUT_MS);

  it("is ready", async () => {
    expect((await request(app).get("/api/ready")).status).toBe(200);
  });

  it("finds all three patients by family name", async () => {
    const response = await request(app).get(`/api/patients?name=${FAMILY_NAME}`);
    expect(response.status).toBe(200);
    expect(response.body.data.map((p: { id: string }) => p.id).sort()).toEqual([
      "it-patient-1",
      "it-patient-2",
      "it-patient-3",
    ]);
  });

  it("returns the full record of a patient, labs newest first", async () => {
    const response = await request(app).get("/api/patients/it-patient-1/record");
    expect(response.status).toBe(200);
    const { patient, conditions, labs, medications } = response.body.data;
    expect(patient).toMatchObject({ id: "it-patient-1", name: `Anna ${FAMILY_NAME}` });
    expect(conditions.map((c: { id: string }) => c.id).sort()).toEqual(["it-cond-1", "it-cond-2"]);
    expect(labs.map((l: { id: string }) => l.id)).toEqual(["it-obs-1", "it-obs-2"]);
    expect(labs[0]).toMatchObject({ value: 6.1, unit: "%", display: "Hemoglobin A1c" });
    expect(medications).toHaveLength(1);
  });

  it("does not mix records between patients", async () => {
    const response = await request(app).get("/api/patients/it-patient-2/record");
    const { conditions, labs, medications } = response.body.data;
    expect(conditions.map((c: { id: string }) => c.id)).toEqual(["it-cond-3"]);
    expect(labs).toHaveLength(0);
    expect(medications).toHaveLength(0);
  });

  it("returns 404 for a patient that does not exist", async () => {
    expect((await request(app).get("/api/patients/it-patient-missing/record")).status).toBe(404);
  });
});
