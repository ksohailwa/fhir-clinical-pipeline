import type { ReactNode } from "react";
import { Link } from "react-router";
import { SyntheticBanner } from "./SyntheticBanner";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10">
        <SyntheticBanner />
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link to="/" className="text-lg font-semibold text-slate-800">
              FHIR Patient View
            </Link>
            <span className="text-xs text-slate-500">HAPI FHIR R4 · MII profiles</span>
          </div>
        </header>
      </div>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
