import type { PatientSummary } from "../record/types";
import { renderFacts, type Fact } from "./facts";
import type { SummaryRequest } from "./provider";

export function buildSystemPrompt(maxSentences: number): string {
  return [
    "You summarise a synthetic patient record for a software demonstration. The data is invented; no real person is involved.",
    "",
    "The record is given as a list of facts. Each fact starts with its id in square brackets.",
    "",
    "Rules:",
    `- Write at most ${maxSentences} sentences in plain, neutral English.`,
    "- Use only the listed facts. Do not add knowledge, interpretation, or causes that are not stated in a fact.",
    "- For every sentence, list in `citations` the ids of the facts it is based on, exactly as written without brackets. Every sentence needs at least one citation.",
    "- Do not give a diagnosis, a prognosis, or treatment advice, and do not suggest what anyone should do.",
    "- Prefer what is current (active conditions, current medications, the most recent laboratory values) over history.",
  ].join("\n");
}

export function buildPrompt(patient: PatientSummary, facts: Fact[]): string {
  const demographics = [
    `Patient: ${patient.gender ?? "gender unknown"}, born ${patient.birthDate ?? "unknown"}`,
    patient.deceasedDate ? `, died ${patient.deceasedDate}` : "",
  ].join("");
  return `${demographics}\n\nFacts:\n${renderFacts(facts)}`;
}

export function buildSummaryRequest(
  patient: PatientSummary,
  facts: Fact[],
  maxSentences: number,
): SummaryRequest {
  return { system: buildSystemPrompt(maxSentences), prompt: buildPrompt(patient, facts) };
}
