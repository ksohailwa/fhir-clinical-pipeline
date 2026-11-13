import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { searchPatients } from "../api/client";
import { ageInYears, capitalize, formatDate } from "../lib/format";

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const name = searchParams.get("name")?.trim() ?? "";
  const [draft, setDraft] = useState(name);

  const results = useQuery({
    queryKey: ["patients", name],
    queryFn: () => searchPatients(name),
    enabled: name.length > 0,
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = draft.trim();
    setSearchParams(value ? { name: value } : {});
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="flex gap-2" role="search">
        <label htmlFor="patient-name" className="sr-only">
          Patient name
        </label>
        <input
          id="patient-name"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Search by first or last name"
          autoFocus
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
        />
        <button
          type="submit"
          className="rounded-md bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800"
        >
          Search
        </button>
      </form>

      {!name && <p className="text-sm text-slate-500">Enter a name to find a patient.</p>}
      {results.isPending && name && <p className="text-sm text-slate-500">Searching…</p>}
      {results.isError && <p className="text-sm text-red-700">{results.error.message}</p>}
      {results.data?.length === 0 && (
        <p className="text-sm text-slate-500">No patients match “{name}”.</p>
      )}

      {results.data && results.data.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {results.data.map((patient) => (
            <li key={patient.id}>
              <Link
                to={`/patients/${patient.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
              >
                <span className="font-medium">{patient.name}</span>
                <span className="text-sm text-slate-500">
                  {capitalize(patient.gender)} · born {formatDate(patient.birthDate)}
                  {patient.deceasedDate
                    ? ` · died ${formatDate(patient.deceasedDate)}`
                    : ` · ${ageInYears(patient.birthDate) ?? "?"} years`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
