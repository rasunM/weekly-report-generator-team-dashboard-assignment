import type { ReactNode } from "react";

export default function FormSection({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-semibold text-slate-400">{number}.</span>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
