"use client";

import Select from "@/components/common/Select";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import type { ReportStatus } from "@/types/report";
import type { User } from "@/types/auth";
import type { ProjectSummary } from "@/types/project";

export interface TeamReportFiltersState {
  userId: string;
  projectId: string;
  status: ReportStatus | "";
  weekFrom: string;
  weekTo: string;
}

export const EMPTY_TEAM_REPORT_FILTERS: TeamReportFiltersState = {
  userId: "",
  projectId: "",
  status: "",
  weekFrom: "",
  weekTo: "",
};

// NOTE: only the 4 real ReportStatus values are offered here (matches GET /api/reports's
// listReportsQuerySchema exactly). "Not Started" is intentionally NOT an option - it isn't a real
// report status, it means "no report row exists for this member/week", so there could never be a
// matching row to filter to. "Not Started" is instead shown correctly in the Report Status by Team
// Member chart below, which is built for exactly that per-week/per-member concept.
const STATUS_OPTIONS: { value: ReportStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "NEEDS_CORRECTION", label: "Needs Correction" },
  { value: "APPROVED", label: "Approved" },
];

export default function TeamReportFilters({
  value,
  onChange,
  members,
  projects,
}: {
  value: TeamReportFiltersState;
  onChange: (next: TeamReportFiltersState) => void;
  members: User[];
  projects: ProjectSummary[];
}) {
  const memberOptions = [{ value: "", label: "All team members" }, ...members.map((m) => ({ value: m.id, label: m.name }))];
  const projectOptions = [{ value: "", label: "All projects" }, ...projects.map((p) => ({ value: p.id, label: p.name }))];

  function set(patch: Partial<TeamReportFiltersState>) {
    onChange({ ...value, ...patch });
  }

  const hasFilters = Boolean(value.userId || value.projectId || value.status || value.weekFrom || value.weekTo);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="w-full sm:w-44">
        <Select label="Team member" value={value.userId} onChange={(e) => set({ userId: e.target.value })} options={memberOptions} />
      </div>
      <div className="w-full sm:w-44">
        <Select label="Project" value={value.projectId} onChange={(e) => set({ projectId: e.target.value })} options={projectOptions} />
      </div>
      <div className="w-full sm:w-40">
        <Select
          label="Status"
          value={value.status}
          onChange={(e) => set({ status: e.target.value as ReportStatus | "" })}
          options={STATUS_OPTIONS}
        />
      </div>
      <div className="w-full sm:w-36">
        <Input label="Week from" type="date" value={value.weekFrom} onChange={(e) => set({ weekFrom: e.target.value })} />
      </div>
      <div className="w-full sm:w-36">
        <Input label="Week to" type="date" value={value.weekTo} onChange={(e) => set({ weekTo: e.target.value })} />
      </div>
      {hasFilters && (
        <Button variant="secondary" onClick={() => onChange(EMPTY_TEAM_REPORT_FILTERS)}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
