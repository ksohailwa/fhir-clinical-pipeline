import request from "supertest";
import { createApp } from "../src/app";
import { FhirError } from "../src/fhir/client";
import type { RecordService } from "../src/record/service";
import type { PatientRecord } from "../src/record/types";

const record: PatientRecord = {
  patient: { id: "p1", name: "Anna Test", birthDate: "1980-05-01", gender: "female", deceasedDate: null },
  conditions: [],
  labs: [],
  medications: [],
};

function service(overrides: Partial<RecordService> = {}): RecordService {
  return {
    searchPatients: async () => [record.patient],
    getRecord: async (id) => (id === "p1" ? record : null),
    ...overrides,
  };
}

describe("GET /api/ready", () => {
  it("is ready when the FHIR server answers", async () => {
    const response = await request(createApp(service(), null, async () => true)).get("/api/ready");
    expect(response.status).toBe(200);
  });

  it("returns 503 while the FHIR server is down", async () => {
    const response = await request(createApp(service(), null, async () => false)).get("/api/ready");
    expect(response.status).toBe(503);
  });
});

describe("GET /api/patients", () => {
  it("wraps results in a data envelope", async () => {
    const response = await request(createApp(service())).get("/api/patients?name=Anna");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [record.patient] });
  });

  it("rejects a missing name", async () => {
    const response = await request(createApp(service())).get("/api/patients");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("BAD_REQUEST");
  });
});

describe("GET /api/patients/:id/record", () => {
  it("returns the record", async () => {
    const response = await request(createApp(service())).get("/api/patients/p1/record");
    expect(response.body).toEqual({ data: record });
  });

  it("returns 404 for an unknown patient", async () => {
    const response = await request(createApp(service())).get("/api/patients/p2/record");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects an id with invalid characters", async () => {
    const response = await request(createApp(service())).get("/api/patients/a%20b/record");
    expect(response.status).toBe(400);
  });

  it("maps FHIR failures to an upstream error without leaking details", async () => {
    const failing = service({
      getRecord: async () => {
        throw new FhirError("FHIR server answered 500", 502);
      },
    });
    const response = await request(createApp(failing)).get("/api/patients/p1/record");
    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: { code: "UPSTREAM_ERROR", message: "The FHIR server request failed" },
    });
  });
});
