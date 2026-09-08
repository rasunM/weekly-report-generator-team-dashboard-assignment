"use client";

// Section 3 ("Tasks Completed"): a dynamic list of task rows - rows can be added/removed, but each
// row's fields are fixed (assignment: "Allow team members to add/remove task rows because tasks
// themselves are dynamic, but the fields of each task must remain fixed"), matching backend/src/
// modules/reports/reports.dto.ts `taskEntrySchema` exactly.
import type { TaskRow } from "./formTypes";
import { newKey } from "./formTypes";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Button from "@/components/common/Button";

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"].map((v) => ({ value: v, label: v }));
const STATUS_OPTIONS = ["Not Started", "In Progress", "Completed", "Blocked"].map((v) => ({ value: v, label: v }));

export type TaskRowErrors = Partial<Record<keyof TaskRow, string>>;

function clampPct(raw: string): number {
  const n = Number(raw);
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function toOptionalNumber(raw: string): number | undefined {
  if (raw === "") return undefined;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : Math.max(0, n);
}

export default function TaskTable({
  rows,
  onChange,
  errors,
}: {
  rows: TaskRow[];
  onChange: (rows: TaskRow[]) => void;
  errors?: Record<string, TaskRowErrors>;
}) {
  function updateRow(key: string, patch: Partial<TaskRow>) {
    onChange(rows.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  }
  function removeRow(key: string) {
    onChange(rows.filter((r) => r._key !== key));
  }
  function addRow() {
    onChange([
      ...rows,
      {
        _key: newKey(),
        taskName: "",
        priority: "Medium",
        plannedPct: 0,
        actualPct: 0,
        status: "Not Started",
        timePlannedHrs: undefined,
        timeSpentHrs: undefined,
        deliverable: "",
      },
    ]);
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.length === 0 && <p className="text-sm text-slate-400">No tasks added yet.</p>}

      {rows.map((row, idx) => {
        const rowErrors = errors?.[row._key] ?? {};
        return (
          <div key={row._key} className="rounded-md border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Task {idx + 1}</span>
              <button
                type="button"
                onClick={() => removeRow(row._key)}
                className="text-xs font-medium text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Task name"
                value={row.taskName}
                onChange={(e) => updateRow(row._key, { taskName: e.target.value })}
                error={rowErrors.taskName}
              />
              <Select
                label="Priority"
                value={row.priority}
                onChange={(e) => updateRow(row._key, { priority: e.target.value })}
                options={PRIORITY_OPTIONS}
                error={rowErrors.priority}
              />
              <Select
                label="Status"
                value={row.status}
                onChange={(e) => updateRow(row._key, { status: e.target.value })}
                options={STATUS_OPTIONS}
                error={rowErrors.status}
              />
              <Input
                label="Planned %"
                type="number"
                min={0}
                max={100}
                value={row.plannedPct}
                onChange={(e) => updateRow(row._key, { plannedPct: clampPct(e.target.value) })}
                error={rowErrors.plannedPct}
              />
              <Input
                label="Actual %"
                type="number"
                min={0}
                max={100}
                value={row.actualPct}
                onChange={(e) => updateRow(row._key, { actualPct: clampPct(e.target.value) })}
                error={rowErrors.actualPct}
              />
              <Input
                label="Planned time (hrs)"
                type="number"
                min={0}
                step={0.5}
                value={row.timePlannedHrs ?? ""}
                onChange={(e) => updateRow(row._key, { timePlannedHrs: toOptionalNumber(e.target.value) })}
              />
              <Input
                label="Time spent (hrs)"
                type="number"
                min={0}
                step={0.5}
                value={row.timeSpentHrs ?? ""}
                onChange={(e) => updateRow(row._key, { timeSpentHrs: toOptionalNumber(e.target.value) })}
              />
              <Input
                label="Output / Deliverable"
                value={row.deliverable ?? ""}
                onChange={(e) => updateRow(row._key, { deliverable: e.target.value })}
                error={rowErrors.deliverable}
              />
            </div>
          </div>
        );
      })}

      <Button type="button" variant="secondary" onClick={addRow} className="self-start">
        + Add Task
      </Button>
    </div>
  );
}
