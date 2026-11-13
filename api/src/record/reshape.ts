import type {
  CodeableConcept,
  FhirCondition,
  FhirMedicationRequest,
  FhirObservation,
  FhirPatient,
  HumanName,
} from "../fhir/schemas";
import type { ConditionItem, LabItem, MedicationItem, PatientSummary } from "./types";

export const UNKNOWN_DISPLAY = "Unknown";

function firstCoding(concept: CodeableConcept | undefined) {
  return concept?.coding?.find((coding) => coding.code || coding.display);
}

export function displayOf(concept: CodeableConcept | undefined): string {
  const coding = firstCoding(concept);
  return coding?.display || concept?.text || coding?.code || UNKNOWN_DISPLAY;
}

export function codeOf(concept: CodeableConcept | undefined): string | null {
  return firstCoding(concept)?.code ?? null;
}

export function formatName(names: HumanName[] | undefined): string {
  const name = names?.find((candidate) => candidate.use === "official") ?? names?.[0];
  const parts = [...(name?.given ?? []), name?.family].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : UNKNOWN_DISPLAY;
}

function dateOnly(value: string | undefined): string | null {
  return value ? value.slice(0, 10) : null;
}

function descending(a: string | null, b: string | null): number {
  return (b ?? "").localeCompare(a ?? "");
}

export function toPatientSummary(patient: FhirPatient): PatientSummary {
  return {
    id: patient.id,
    name: formatName(patient.name),
    birthDate: patient.birthDate ?? null,
    gender: patient.gender ?? null,
    deceasedDate: dateOnly(patient.deceasedDateTime),
  };
}

export function toConditionItem(condition: FhirCondition): ConditionItem {
  return {
    id: condition.id,
    code: codeOf(condition.code),
    display: displayOf(condition.code),
    onset: dateOnly(condition.onsetDateTime),
    abatement: dateOnly(condition.abatementDateTime),
    clinicalStatus: codeOf(condition.clinicalStatus),
  };
}

export function toLabItem(observation: FhirObservation): LabItem {
  const quantity = observation.valueQuantity;
  const value =
    quantity?.value ??
    (observation.valueCodeableConcept ? displayOf(observation.valueCodeableConcept) : null) ??
    observation.valueString ??
    null;
  return {
    id: observation.id,
    code: codeOf(observation.code),
    display: displayOf(observation.code),
    value,
    unit: quantity ? (quantity.unit ?? quantity.code ?? null) : null,
    date: observation.effectiveDateTime ?? null,
  };
}

export function toMedicationItem(request: FhirMedicationRequest): MedicationItem {
  return {
    id: request.id,
    code: codeOf(request.medicationCodeableConcept),
    display: displayOf(request.medicationCodeableConcept),
    start: dateOnly(request.authoredOn),
    status: request.status ?? null,
  };
}

export function sortByDateDescending<T>(items: T[], dateOf: (item: T) => string | null): T[] {
  return [...items].sort((a, b) => descending(dateOf(a), dateOf(b)));
}
