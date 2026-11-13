import type { ConditionItem, LabItem, MedicationItem, PatientRecord } from "../record/types";

export interface Fact {
  id: string;
  line: string;
}

export interface FactLimits {
  maxConditionFacts: number;
  maxLabFacts: number;
  maxMedicationFacts: number;
}

export interface FactList {
  facts: Fact[];
  omitted: { conditions: number; labs: number; medications: number };
}

function newestPerKey<T>(items: T[], keyOf: (item: T) => string, dateOf: (item: T) => string | null): T[] {
  const newest = new Map<string, T>();
  for (const item of items) {
    const key = keyOf(item);
    const current = newest.get(key);
    if (!current || (dateOf(item) ?? "") > (dateOf(current) ?? "")) newest.set(key, item);
  }
  return [...newest.values()].sort((a, b) => (dateOf(b) ?? "").localeCompare(dateOf(a) ?? ""));
}

function orUnknown(value: string | null): string {
  return value ?? "unknown date";
}

function conditionLine(condition: ConditionItem): string {
  const status = condition.clinicalStatus ?? "status unknown";
  const resolved = condition.abatement ? `, resolved ${condition.abatement}` : "";
  return `Condition: ${condition.display}, onset ${orUnknown(condition.onset)}${resolved}, ${status}`;
}

function labLine(lab: LabItem): string {
  const value = lab.value === null ? "no value" : `${lab.value}${lab.unit ? ` ${lab.unit}` : ""}`;
  return `Lab: ${lab.display} ${value} on ${orUnknown(lab.date?.slice(0, 10) ?? null)}`;
}

function medicationLine(medication: MedicationItem): string {
  return `Medication: ${medication.display}, started ${orUnknown(medication.start)}, ${medication.status ?? "status unknown"}`;
}

export function buildFacts(record: PatientRecord, limits: FactLimits): FactList {
  const conditions = newestPerKey(record.conditions, (c) => c.code ?? c.display, (c) => c.onset);
  const labs = newestPerKey(record.labs, (l) => l.code ?? l.display, (l) => l.date);
  const medications = newestPerKey(record.medications, (m) => m.code ?? m.display, (m) => m.start);

  const selected = {
    conditions: conditions.slice(0, limits.maxConditionFacts),
    labs: labs.slice(0, limits.maxLabFacts),
    medications: medications.slice(0, limits.maxMedicationFacts),
  };

  return {
    facts: [
      ...selected.conditions.map((c) => ({ id: c.id, line: conditionLine(c) })),
      ...selected.labs.map((l) => ({ id: l.id, line: labLine(l) })),
      ...selected.medications.map((m) => ({ id: m.id, line: medicationLine(m) })),
    ],
    omitted: {
      conditions: record.conditions.length - selected.conditions.length,
      labs: record.labs.length - selected.labs.length,
      medications: record.medications.length - selected.medications.length,
    },
  };
}

export function renderFacts(facts: Fact[]): string {
  return facts.map((fact) => `[${fact.id}] ${fact.line}`).join("\n");
}
