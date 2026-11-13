import type { ReactNode } from "react";

interface SectionProps {
  id: string;
  title: string;
  count: number;
  children: ReactNode;
}

export function Section({ id, title, count, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-28 rounded-lg border border-slate-200 bg-white">
      <h2 className="flex items-baseline gap-2 border-b border-slate-200 px-4 py-3 text-base font-semibold">
        {title}
        <span className="text-sm font-normal text-slate-500">{count}</span>
      </h2>
      {count === 0 ? <p className="px-4 py-3 text-sm text-slate-500">None recorded.</p> : children}
    </section>
  );
}

export const tableClass = "w-full text-left text-sm";
export const headCellClass = "px-4 py-2 font-medium text-slate-500";
export const cellClass = "px-4 py-2 align-top";
export const rowClass = "scroll-mt-28 border-t border-slate-100";
