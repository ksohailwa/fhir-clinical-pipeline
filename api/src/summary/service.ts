import type { RecordService } from "../record/service";
import { checkCitations, isAcceptable, type CheckedSentence } from "./citations";
import { buildFacts, type FactLimits } from "./facts";
import { buildSummaryRequest } from "./prompt";
import { summarizeWithFallback, type SummaryProvider } from "./provider";

export interface SummaryOptions extends FactLimits {
  maxSentences: number;
  maxFailedSentences: number;
}

export interface PatientSummaryResult {
  sentences: CheckedSentence[];
  flaggedCount: number;
  accepted: boolean;
  attempts: number;
  provider: { name: string; model: string };
  factCount: number;
  omitted: { conditions: number; labs: number; medications: number };
  latencyMs: number;
}

export interface SummaryService {
  summarize(patientId: string): Promise<PatientSummaryResult | null>;
}

export type SummaryLogger = (entry: Record<string, unknown>) => void;

const MAX_ATTEMPTS = 2;

export function createSummaryService(
  records: RecordService,
  providers: readonly SummaryProvider[],
  options: SummaryOptions,
  log: SummaryLogger = (entry) => console.log(JSON.stringify(entry)),
  now: () => number = () => performance.now(),
): SummaryService {
  return {
    async summarize(patientId) {
      const record = await records.getRecord(patientId);
      if (!record) return null;

      const { facts, omitted } = buildFacts(record, options);
      const knownIds = new Set(facts.map((fact) => fact.id));
      const request = buildSummaryRequest(record.patient, facts, options.maxSentences);

      const started = now();
      let attempt = 0;
      while (true) {
        attempt += 1;
        const { draft, provider, failures } = await summarizeWithFallback(providers, request);
        const check = checkCitations(draft, knownIds);
        const accepted = isAcceptable(check, options.maxFailedSentences);
        const latencyMs = Math.round(now() - started);

        log({
          event: "summary",
          patientId,
          attempt,
          provider: provider.name,
          model: provider.model,
          providerFailures: failures,
          latencyMs,
          facts: facts.length,
          sentences: check.sentences.length,
          flagged: check.failedCount,
          accepted,
        });

        if (accepted || attempt >= MAX_ATTEMPTS) {
          return {
            sentences: check.sentences,
            flaggedCount: check.failedCount,
            accepted,
            attempts: attempt,
            provider: { name: provider.name, model: provider.model },
            factCount: facts.length,
            omitted,
            latencyMs,
          };
        }
      }
    },
  };
}
