import { useMemo, useState } from "react";
import type { LabItem } from "../../api/types";
import { cellClass, headCellClass, rowClass, tableClass } from "../../components/Section";
import { formatDate, formatValue } from "../../lib/format";
import { groupLabs, type LabGroup } from "./groupLabs";

const VISIBLE_RESULTS = 5;

function LabGroupRows({ group }: { group: LabGroup }) {
  const [expanded, setExpanded] = useState(false);
  const hidden = group.results.length - VISIBLE_RESULTS;
  const visible = expanded ? group.results : group.results.slice(0, VISIBLE_RESULTS);

  return (
    <tbody>
      <tr className="border-t border-slate-200 bg-slate-50">
        <th colSpan={3} className="px-4 py-2 text-left font-medium">
          {group.display}
          {group.code && <span className="ml-2 font-mono text-xs text-slate-500">LOINC {group.code}</span>}
        </th>
      </tr>
      {visible.map((lab) => (
        <tr key={lab.id} id={lab.id} className={rowClass}>
          <td className={`${cellClass} w-32 text-slate-600`}>{formatDate(lab.date)}</td>
          <td className={`${cellClass} font-medium`}>{formatValue(lab.value, lab.unit)}</td>
          <td className={`${cellClass} w-48 font-mono text-xs text-slate-400`}>{lab.id}</td>
        </tr>
      ))}
      {hidden > 0 && (
        <tr>
          <td colSpan={3} className="px-4 pb-2">
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="text-sm text-sky-700 hover:underline"
            >
              {expanded ? "Show fewer" : `Show ${hidden} older`}
            </button>
          </td>
        </tr>
      )}
    </tbody>
  );
}

export function LabResults({ labs }: { labs: LabItem[] }) {
  const groups = useMemo(() => groupLabs(labs), [labs]);
  return (
    <div className="overflow-x-auto">
      <table className={tableClass}>
        <thead>
          <tr>
            <th className={headCellClass}>Date</th>
            <th className={headCellClass}>Value</th>
            <th className={headCellClass}>Resource</th>
          </tr>
        </thead>
        {groups.map((group) => (
          <LabGroupRows key={group.key} group={group} />
        ))}
      </table>
    </div>
  );
}
