import type { ReactNode } from "react";

// Shared "title + subtitle + optional action button" header, used at the top of every top-level
// page (dashboards, list pages) so heading size, spacing, and layout stay identical everywhere
// instead of each page re-implementing the same div by hand. Pages with a bespoke header (e.g. a
// back link plus a status badge) keep their own markup - this is for the common case only.
export default function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
