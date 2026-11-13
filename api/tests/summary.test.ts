import request from "supertest";
import { createApp } from "../src/app";
import type { RecordService } from "../src/record/service";
import type { PatientRecord } from "../src/record/types";
import { checkCitations } from "../src/summary/citations";
import { buildFacts } from "../src/summary/facts";
import {
  ProviderError,
  summarizeWithFallback,
  type SummaryDraft,
  type SummaryProvider,
} from "../src/summary/provider";
import { createSummaryService, type SummaryOptions } from "../src/summary/service";

const record: PatientRecord = {
  patient: { id: "p1", name: "Anna Test", birthDate: "1980-05-01", gender: "female", deceasedDate: null },
  conditions: [
    { id: "cond-1", code: "38341003", display: "Hypertension", onset: "2015-03-02", abatement: null, clinicalStatus: "active" },
  ],
  labs: [
    { id: "obs-new", code: "4548-4", display: "Hemoglobin A1c", value: 6.1, unit: "%", date: "2024-11-03T06:00:00Z" },
    { id: "obs-old", code: "4548-4", display: "Hemoglobin A1c", value: 5.8, unit: "%", date: "2022-01-10T06:00:00Z" },
  ],
  medications: [
    { id: "med-1", code: "314076", display: "Lisinopril 10 MG", start: "2015-03-02", status: "active" },
  ],
};

const options: SummaryOptions = {
  maxSentences: 5,
  maxFailedSentences: 1,
  maxConditionFacts: 40,
  maxLabFacts: 40,
  maxMedicationFacts: 20,
};

const records: RecordService = {
  searchPatients: async () => [record.patient],
  getRecord: async (id) => (id === "p1" ? record : null),
};

const GOOD: SummaryDraft = {
  sentences: [
    { text: "The patient has active hypertension since 2015.", citations: ["cond-1"] },
    { text: "Her latest HbA1c was 6.1 %.", citations: ["obs-new"] },
    { text: "She takes lisinopril.", citations: ["med-1"] },
  ],
};

const INVENTED_IDS: SummaryDraft = {
  sentences: [
    { text: "The patient has hypertension.", citations: ["cond-1"] },
    { text: "She had a stroke in 2019.", citations: ["cond-999"] },
    { text: "Her kidney function is reduced.", citations: ["obs-404"] },
  ],
};

const NO_CITATIONS: SummaryDraft = {
  sentences: [
    { text: "The patient is generally healthy.", citations: [] },
    { text: "She should exercise more.", citations: [] },
  ],
};

function mockProvider(model: string, ...drafts: (SummaryDraft | Error)[]): SummaryProvider & { calls: number } {
  const provider = {
    name: "mock",
    model,
    calls: 0,
    async summarize() {
      const next = drafts[Math.min(provider.calls, drafts.length - 1)]!;
      provider.calls += 1;
      if (next instanceof Error) throw next;
      return next;
    },
  };
  return provider;
}

const silent = () => undefined;

describe("buildFacts", () => {
  it("keeps only the newest result per laboratory test", () => {
    const { facts, omitted } = buildFacts(record, options);
    expect(facts.map((fact) => fact.id)).toEqual(["cond-1", "obs-new", "med-1"]);
    expect(omitted.labs).toBe(1);
  });

  it("respects the per-type limits", () => {
    const { facts, omitted } = buildFacts(record, { ...options, maxLabFacts: 0 });
    expect(facts.some((fact) => fact.id.startsWith("obs"))).toBe(false);
    expect(omitted.labs).toBe(2);
  });
});

describe("checkCitations", () => {
  const known = new Set(["cond-1", "obs-new", "med-1"]);

  it("accepts a fully cited answer", () => {
    expect(checkCitations(GOOD, known).failedCount).toBe(0);
  });

  it("flags sentences that cite invented ids and drops those ids", () => {
    const check = checkCitations(INVENTED_IDS, known);
    expect(check.failedCount).toBe(2);
    expect(check.sentences[1]).toMatchObject({
      citations: [],
      unknownCitations: ["cond-999"],
      flags: ["unknown_citation", "no_citation"],
    });
  });

  it("flags sentences without citations", () => {
    const check = checkCitations(NO_CITATIONS, known);
    expect(check.sentences.every((sentence) => sentence.flags.includes("no_citation"))).toBe(true);
  });

  it("tolerates ids wrapped in brackets", () => {
    const check = checkCitations({ sentences: [{ text: "x", citations: ["[cond-1]"] }] }, known);
    expect(check.sentences[0]?.citations).toEqual(["cond-1"]);
  });
});

describe("summary service", () => {
  it("returns a good answer on the first attempt", async () => {
    const provider = mockProvider("primary", GOOD);
    const result = await createSummaryService(records, [provider], options, silent).summarize("p1");
    expect(result).toMatchObject({ accepted: true, attempts: 1, flaggedCount: 0, factCount: 3 });
  });

  it("rejects an answer with invented ids and retries once", async () => {
    const provider = mockProvider("primary", INVENTED_IDS, GOOD);
    const result = await createSummaryService(records, [provider], options, silent).summarize("p1");
    expect(provider.calls).toBe(2);
    expect(result).toMatchObject({ accepted: true, attempts: 2, flaggedCount: 0 });
  });

  it("returns the flagged answer after the retry also fails", async () => {
    const provider = mockProvider("primary", NO_CITATIONS);
    const result = await createSummaryService(records, [provider], options, silent).summarize("p1");
    expect(provider.calls).toBe(2);
    expect(result).toMatchObject({ accepted: false, attempts: 2, flaggedCount: 2 });
  });

  it("logs provider, latency, fact count and flagged sentences", async () => {
    const entries: Record<string, unknown>[] = [];
    await createSummaryService(records, [mockProvider("primary", GOOD)], options, (entry) =>
      entries.push(entry),
    ).summarize("p1");
    expect(entries[0]).toMatchObject({ provider: "mock", model: "primary", facts: 3, flagged: 0 });
    expect(entries[0]).toHaveProperty("latencyMs");
  });
});

describe("summarizeWithFallback", () => {
  it("uses the fallback when the primary fails", async () => {
    const primary = mockProvider("primary", new ProviderError("timeout", "mock"));
    const fallback = mockProvider("fallback", GOOD);
    const result = await summarizeWithFallback([primary, fallback], { system: "", prompt: "" });
    expect(result.provider.model).toBe("fallback");
    expect(result.failures).toEqual(["mock/primary: timeout"]);
  });

  it("throws when every provider fails", async () => {
    const failing = mockProvider("primary", new Error("down"));
    await expect(summarizeWithFallback([failing], { system: "", prompt: "" })).rejects.toThrow(
      ProviderError,
    );
  });
});

describe("POST /api/patients/:id/summary", () => {
  it("returns 503 when no LLM is configured", async () => {
    const response = await request(createApp(records, null)).post("/api/patients/p1/summary");
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("LLM_NOT_CONFIGURED");
  });

  it("returns the checked summary", async () => {
    const summaries = createSummaryService(records, [mockProvider("primary", GOOD)], options, silent);
    const response = await request(createApp(records, summaries)).post("/api/patients/p1/summary");
    expect(response.status).toBe(200);
    expect(response.body.data.sentences).toHaveLength(3);
  });

  it("returns 502 when every provider fails", async () => {
    const summaries = createSummaryService(
      records,
      [mockProvider("primary", new ProviderError("down", "mock"))],
      options,
      silent,
    );
    const response = await request(createApp(records, summaries)).post("/api/patients/p1/summary");
    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe("LLM_FAILED");
  });
});
