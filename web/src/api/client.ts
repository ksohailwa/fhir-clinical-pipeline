import type { PatientRecord, PatientSummary } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Envelope<T> = { data: T } | { error: { code: string; message: string } };

async function getData<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: { Accept: "application/json" } });
  const body = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!response.ok || !body || "error" in body) {
    const message = body && "error" in body ? body.error.message : `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }
  return body.data;
}

export function searchPatients(name: string): Promise<PatientSummary[]> {
  return getData(`/api/patients?${new URLSearchParams({ name })}`);
}

export function getPatientRecord(id: string): Promise<PatientRecord> {
  return getData(`/api/patients/${encodeURIComponent(id)}/record`);
}
