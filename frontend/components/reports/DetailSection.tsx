import type { ReactNode } from "react";

// Read-only counterpart to FormSection.tsx - no section number (the fixed-order numbering is a
// property of the create/edit form, not this display).
export default function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
