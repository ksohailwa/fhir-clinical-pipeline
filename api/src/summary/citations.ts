import type { SummaryDraft } from "./provider";

export type SentenceFlag = "unknown_citation" | "no_citation";

export interface CheckedSentence {
  text: string;
  citations: string[];
  unknownCitations: string[];
  flags: SentenceFlag[];
}

export interface CitationCheck {
  sentences: CheckedSentence[];
  failedCount: number;
}

export function checkCitations(draft: SummaryDraft, knownIds: ReadonlySet<string>): CitationCheck {
  const sentences = draft.sentences
    .filter((sentence) => sentence.text.trim().length > 0)
    .map((sentence): CheckedSentence => {
      const unique = [...new Set(sentence.citations.map((id) => id.trim().replace(/^\[|\]$/g, "")))];
      const citations = unique.filter((id) => knownIds.has(id));
      const unknownCitations = unique.filter((id) => !knownIds.has(id));
      const flags: SentenceFlag[] = [];
      if (unknownCitations.length > 0) flags.push("unknown_citation");
      if (citations.length === 0) flags.push("no_citation");
      return { text: sentence.text.trim(), citations, unknownCitations, flags };
    });
  return { sentences, failedCount: sentences.filter((s) => s.flags.length > 0).length };
}

export function isAcceptable(check: CitationCheck, maxFailedSentences: number): boolean {
  return check.sentences.length > 0 && check.failedCount <= maxFailedSentences;
}
