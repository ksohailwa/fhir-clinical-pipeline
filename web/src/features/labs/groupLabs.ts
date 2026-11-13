import type { LabItem } from "../../api/types";

export interface LabGroup {
  key: string;
  display: string;
  code: string | null;
  results: LabItem[];
}

function byDateDescending(a: LabItem, b: LabItem): number {
  return (b.date ?? "").localeCompare(a.date ?? "");
}

export function groupLabs(labs: LabItem[]): LabGroup[] {
  const groups = new Map<string, LabGroup>();
  for (const lab of labs) {
    const key = lab.code ?? lab.display;
    const group = groups.get(key) ?? { key, display: lab.display, code: lab.code, results: [] };
    group.results.push(lab);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => ({ ...group, results: [...group.results].sort(byDateDescending) }))
    .sort(
      (a, b) =>
        byDateDescending(a.results[0]!, b.results[0]!) || a.display.localeCompare(b.display),
    );
}
