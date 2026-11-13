const LOINC = "http://loinc.org";
const SNOMED = "http://snomed.info/sct";
const RXNORM = "http://www.nlm.nih.gov/research/umls/rxnorm";
const LAB_CATEGORY = {
  coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "laboratory" }],
};

type Resource = { resourceType: string; id: string } & Record<string, unknown>;

function patient(id: string, family: string, given: string, birthDate: string): Resource {
  return {
    resourceType: "Patient",
    id,
    name: [{ use: "official", family, given: [given] }],
    gender: "female",
    birthDate,
  };
}

function condition(id: string, patientId: string, code: string, display: string, onset: string): Resource {
  return {
    resourceType: "Condition",
    id,
    subject: { reference: `Patient/${patientId}` },
    code: { coding: [{ system: SNOMED, code, display }] },
    clinicalStatus: {
      coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }],
    },
    onsetDateTime: onset,
  };
}

function lab(id: string, patientId: string, value: number, date: string): Resource {
  return {
    resourceType: "Observation",
    id,
    status: "final",
    category: [LAB_CATEGORY],
    subject: { reference: `Patient/${patientId}` },
    code: { coding: [{ system: LOINC, code: "4548-4", display: "Hemoglobin A1c" }] },
    effectiveDateTime: date,
    valueQuantity: { value, unit: "%", system: "http://unitsofmeasure.org", code: "%" },
  };
}

function medication(id: string, patientId: string, start: string): Resource {
  return {
    resourceType: "MedicationRequest",
    id,
    status: "active",
    intent: "order",
    subject: { reference: `Patient/${patientId}` },
    medicationCodeableConcept: { coding: [{ system: RXNORM, code: "314076", display: "lisinopril 10 MG Oral Tablet" }] },
    authoredOn: start,
  };
}

export const FAMILY_NAME = "Integrationtest";

export const PATIENTS = [
  patient("it-patient-1", FAMILY_NAME, "Anna", "1980-05-01"),
  patient("it-patient-2", FAMILY_NAME, "Berta", "1975-11-20"),
  patient("it-patient-3", FAMILY_NAME, "Clara", "1992-02-14"),
];

export const CHILDREN = [
  condition("it-cond-1", "it-patient-1", "38341003", "Hypertension", "2015-03-02"),
  condition("it-cond-2", "it-patient-1", "44054006", "Diabetes mellitus type 2", "2018-07-10"),
  lab("it-obs-1", "it-patient-1", 6.1, "2024-11-03T06:00:00Z"),
  lab("it-obs-2", "it-patient-1", 6.8, "2023-05-12T06:00:00Z"),
  medication("it-med-1", "it-patient-1", "2015-03-02"),
  condition("it-cond-3", "it-patient-2", "38341003", "Hypertension", "2010-01-15"),
];

export function transactionBundle(resources: Resource[]) {
  return {
    resourceType: "Bundle",
    type: "transaction",
    entry: resources.map((resource) => ({
      resource,
      request: { method: "PUT", url: `${resource.resourceType}/${resource.id}` },
    })),
  };
}
