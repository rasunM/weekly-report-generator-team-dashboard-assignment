"use client";

// Generic reusable list-of-text-lines editor. Used for Section 4 ("Tasks Planned for Next Week"),
// which the backend stores as a plain string[] (reports.dto.ts: `tasksPlannedNextWeek`).
import type { TextRow } from "./formTypes";
import { newKey } from "./formTypes";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";

export default function StringListEditor({
  rows,
  onChange,
  placeholder,
  addLabel,
  errors,
}: {
  rows: TextRow[];
  onChange: (rows: TextRow[]) => void;
  placeholder: string;
  addLabel: string;
  errors?: Record<string, string>;
}) {
  function update(key: string, text: string) {
    onChange(rows.map((r) => (r._key === key ? { ...r, text } : r)));
  }
  function remove(key: string) {
    onChange(rows.filter((r) => r._key !== key));
  }
  function add() {
    onChange([...rows, { _key: newKey(), text: "" }]);
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.length === 0 && <p className="text-sm text-slate-400">Nothing added yet.</p>}
      {rows.map((row) => (
        <div key={row._key} className="flex items-start gap-2">
          <div className="flex-1">
            <Input
              aria-label={placeholder}
              placeholder={placeholder}
              value={row.text}
              onChange={(e) => update(row._key, e.target.value)}
              error={errors?.[row._key]}
            />
          </div>
          <button
            type="button"
            onClick={() => remove(row._key)}
            className="mt-2 text-xs font-medium text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={add} className="self-start">
        {addLabel}
      </Button>
    </div>
  );
}
