export interface PatientSummary {
  id: string;
  name: string;
  birthDate: string | null;
  gender: string | null;
  deceasedDate: string | null;
}

export interface ConditionItem {
  id: string;
  code: string | null;
  display: string;
  onset: string | null;
  abatement: string | null;
  clinicalStatus: string | null;
}

export interface LabItem {
  id: string;
  code: string | null;
  display: string;
  value: number | string | null;
  unit: string | null;
  date: string | null;
}

export interface MedicationItem {
  id: string;
  code: string | null;
  display: string;
  start: string | null;
  status: string | null;
}

export type SentenceFlag = "unknown_citation" | "no_citation";

export interface SummarySentence {
  text: string;
  citations: string[];
  unknownCitations: string[];
  flags: SentenceFlag[];
}

export interface PatientSummaryResult {
  sentences: SummarySentence[];
  flaggedCount: number;
  accepted: boolean;
  attempts: number;
  provider: { name: string; model: string };
  factCount: number;
  omitted: { conditions: number; labs: number; medications: number };
  latencyMs: number;
}

export interface PatientRecord {
  patient: PatientSummary;
  conditions: ConditionItem[];
  labs: LabItem[];
  medications: MedicationItem[];
}
