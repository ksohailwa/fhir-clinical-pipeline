import { config } from "../config";
import type { FhirClient } from "../fhir/client";
import {
  ConditionSchema,
  MedicationRequestSchema,
  ObservationSchema,
  PatientSchema,
} from "../fhir/schemas";
import {
  sortByDateDescending,
  toConditionItem,
  toLabItem,
  toMedicationItem,
  toPatientSummary,
} from "./reshape";
import type { PatientRecord, PatientSummary } from "./types";

export interface RecordService {
  searchPatients(name: string): Promise<PatientSummary[]>;
  getRecord(patientId: string): Promise<PatientRecord | null>;
}

export function createRecordService(fhir: FhirClient): RecordService {
  const allPages = { allPages: true };
  const recordCount = String(config.recordPageSize);

  return {
    async searchPatients(name) {
      const patients = await fhir.search(
        "Patient",
        { name, _count: String(config.searchPageSize), _sort: "family,given" },
        PatientSchema,
        { allPages: false },
      );
      return patients.map(toPatientSummary);
    },

    async getRecord(patientId) {
      const patient = await fhir.read("Patient", patientId, PatientSchema);
      if (!patient) return null;

      const [conditions, observations, medications] = await Promise.all([
        fhir.search(
          "Condition",
          { patient: patientId, _count: recordCount },
          ConditionSchema,
          allPages,
        ),
        fhir.search(
          "Observation",
          { patient: patientId, category: "laboratory", _sort: "-date", _count: recordCount },
          ObservationSchema,
          allPages,
        ),
        fhir.search(
          "MedicationRequest",
          { patient: patientId, _count: recordCount },
          MedicationRequestSchema,
          allPages,
        ),
      ]);

      return {
        patient: toPatientSummary(patient),
        conditions: sortByDateDescending(conditions.map(toConditionItem), (item) => item.onset),
        labs: sortByDateDescending(observations.map(toLabItem), (item) => item.date),
        medications: sortByDateDescending(medications.map(toMedicationItem), (item) => item.start),
      };
    },
  };
}
