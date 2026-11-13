import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { getPatientRecord } from "../api/client";
import type { PatientRecord } from "../api/types";
import { cellClass, headCellClass, rowClass, Section, tableClass } from "../components/Section";
import { LabResults } from "../features/labs/LabResults";
import { ageInYears, capitalize, EMPTY, formatDate } from "../lib/format";

function PatientHeader({ patient }: Pick<PatientRecord, "patient">) {
  const age = ageInYears(patient.birthDate, patient.deceasedDate ? new Date(patient.deceasedDate) : undefined);
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
      <h1 className="text-2xl font-semibold">{patient.name}</h1>
      <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
        <div>
          <dt className="inline text-slate-400">Gender </dt>
          <dd className="inline">{capitalize(patient.gender)}</dd>
        </div>
        <div>
          <dt className="inline text-slate-400">Born </dt>
          <dd className="inline">
            {formatDate(patient.birthDate)} {age !== null && `(${age} years)`}
          </dd>
        </div>
        {patient.deceasedDate && (
          <div>
            <dt className="inline text-slate-400">Died </dt>
            <dd className="inline">{formatDate(patient.deceasedDate)}</dd>
          </div>
        )}
        <div>
          <dt className="inline text-slate-400">FHIR id </dt>
          <dd className="inline font-mono text-xs">{patient.id}</dd>
        </div>
      </dl>
    </div>
  );
}

function Conditions({ conditions }: Pick<PatientRecord, "conditions">) {
  return (
    <Section id="conditions" title="Conditions" count={conditions.length}>
      <div className="overflow-x-auto">
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={headCellClass}>Condition</th>
              <th className={headCellClass}>Onset</th>
              <th className={headCellClass}>Resolved</th>
              <th className={headCellClass}>Status</th>
            </tr>
          </thead>
          <tbody>
            {conditions.map((condition) => (
              <tr key={condition.id} id={condition.id} className={rowClass}>
                <td className={cellClass}>
                  {condition.display}
                  {condition.code && (
                    <span className="ml-2 font-mono text-xs text-slate-400">SNOMED {condition.code}</span>
                  )}
                </td>
                <td className={`${cellClass} whitespace-nowrap`}>{formatDate(condition.onset)}</td>
                <td className={`${cellClass} whitespace-nowrap`}>{formatDate(condition.abatement)}</td>
                <td className={cellClass}>{capitalize(condition.clinicalStatus)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function Medications({ medications }: Pick<PatientRecord, "medications">) {
  return (
    <Section id="medications" title="Medications" count={medications.length}>
      <div className="overflow-x-auto">
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={headCellClass}>Medication</th>
              <th className={headCellClass}>Started</th>
              <th className={headCellClass}>Status</th>
            </tr>
          </thead>
          <tbody>
            {medications.map((medication) => (
              <tr key={medication.id} id={medication.id} className={rowClass}>
                <td className={cellClass}>
                  {medication.display}
                  {medication.code && (
                    <span className="ml-2 font-mono text-xs text-slate-400">RxNorm {medication.code}</span>
                  )}
                </td>
                <td className={`${cellClass} whitespace-nowrap`}>{formatDate(medication.start)}</td>
                <td className={cellClass}>{capitalize(medication.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

export function PatientPage() {
  const { id = "" } = useParams();
  const record = useQuery({ queryKey: ["record", id], queryFn: () => getPatientRecord(id) });

  if (record.isPending) return <p className="text-sm text-slate-500">Loading record…</p>;
  if (record.isError) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-700">{record.error.message}</p>
        <Link to="/" className="text-sm text-sky-700 hover:underline">
          Back to search
        </Link>
      </div>
    );
  }

  const { patient, conditions, labs, medications } = record.data;
  const sections = [
    { id: "conditions", label: "Conditions", count: conditions.length },
    { id: "labs", label: "Laboratory values", count: labs.length },
    { id: "medications", label: "Medications", count: medications.length },
  ];

  return (
    <div className="space-y-4">
      <Link to="/" className="text-sm text-sky-700 hover:underline">
        ← New search
      </Link>
      <PatientHeader patient={patient} />
      <nav className="flex flex-wrap gap-2 text-sm">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 hover:bg-slate-100"
          >
            {section.label} <span className="text-slate-400">{section.count || EMPTY}</span>
          </a>
        ))}
      </nav>
      <Conditions conditions={conditions} />
      <Section id="labs" title="Laboratory values" count={labs.length}>
        <LabResults labs={labs} />
      </Section>
      <Medications medications={medications} />
    </div>
  );
}
