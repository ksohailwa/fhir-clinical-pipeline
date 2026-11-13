import { useMutation } from "@tanstack/react-query";
import { summarizePatient } from "../../api/client";
import type { SummarySentence } from "../../api/types";

const FLAG_LABELS: Record<SummarySentence["flags"][number], string> = {
  unknown_citation: "cites a fact that is not in the record",
  no_citation: "has no supporting fact",
};

function Citation({ id, index }: { id: string; index: number }) {
  return (
    <a
      href={`#${id}`}
      title={id}
      className="ml-0.5 rounded bg-sky-100 px-1 font-mono text-xs text-sky-800 hover:bg-sky-200"
    >
      {index}
    </a>
  );
}

function Sentence({ sentence, citationNumber }: { sentence: SummarySentence; citationNumber: (id: string) => number }) {
  const flagged = sentence.flags.length > 0;
  return (
    <li className={flagged ? "rounded border-l-4 border-red-500 bg-red-50 px-2 py-1" : undefined}>
      {sentence.text}
      {sentence.citations.map((id) => (
        <Citation key={id} id={id} index={citationNumber(id)} />
      ))}
      {flagged && (
        <p className="mt-1 text-xs font-medium text-red-700">
          Unverified: this sentence {sentence.flags.map((flag) => FLAG_LABELS[flag]).join(" and ")}
          {sentence.unknownCitations.length > 0 && ` (${sentence.unknownCitations.join(", ")})`}.
        </p>
      )}
    </li>
  );
}

export function SummaryPanel({ patientId }: { patientId: string }) {
  const summary = useMutation({ mutationFn: () => summarizePatient(patientId) });
  const data = summary.data;

  const order: string[] = [];
  data?.sentences.forEach((sentence) =>
    sentence.citations.forEach((id) => order.includes(id) || order.push(id)),
  );
  const citationNumber = (id: string) => order.indexOf(id) + 1;

  return (
    <section className="rounded-lg border border-violet-200 bg-violet-50/50">
      <div className="flex items-center justify-between gap-4 border-b border-violet-200 px-4 py-3">
        <h2 className="text-base font-semibold text-violet-950">AI-generated summary of synthetic data</h2>
        <button
          type="button"
          onClick={() => summary.mutate()}
          disabled={summary.isPending}
          className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-60"
        >
          {summary.isPending ? "Summarising…" : data ? "Regenerate" : "Summarise record"}
        </button>
      </div>
      <div className="px-4 py-3 text-sm">
        {!data && !summary.isPending && !summary.isError && (
          <p className="text-slate-600">
            Generates a short summary from this record. Every sentence links to the rows it is based on.
          </p>
        )}
        {summary.isError && <p className="text-red-700">{summary.error.message}</p>}
        {data && (
          <>
            {!data.accepted && (
              <p className="mb-2 rounded bg-red-100 px-2 py-1 text-red-800">
                The citation check failed twice. Treat flagged sentences as unsupported.
              </p>
            )}
            <ol className="space-y-1.5 leading-relaxed">
              {data.sentences.map((sentence, index) => (
                <Sentence key={index} sentence={sentence} citationNumber={citationNumber} />
              ))}
            </ol>
            <p className="mt-3 text-xs text-slate-500">
              {data.provider.model} · {data.factCount} facts sent · {data.flaggedCount} flagged ·{" "}
              {data.attempts} attempt{data.attempts > 1 ? "s" : ""} · {(data.latencyMs / 1000).toFixed(1)} s. Not
              medical advice.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
