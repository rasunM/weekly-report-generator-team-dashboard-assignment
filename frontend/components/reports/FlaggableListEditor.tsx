"use client";

// Generic reusable editor for a list of {text, isKey} entries. Used for both Section 5 (Blockers,
// keyLabel="Key Issue") and Section 6 (Achievements, keyLabel="Key Achievement") - same shape
// (flaggableEntrySchema in reports.dto.ts), only the labels differ. Only one row may be marked as
// the key item at a time (assignment: "Allow one blocker to be marked as Key Issue"); selecting a
// new one automatically clears any previous selection.
import type { FlaggableRow } from "./formTypes";
import { newKey } from "./formTypes";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";

export default function FlaggableListEditor({
  rows,
  onChange,
  placeholder,
  addLabel,
  keyLabel,
  errors,
}: {
  rows: FlaggableRow[];
  onChange: (rows: FlaggableRow[]) => void;
  placeholder: string;
  addLabel: string;
  keyLabel: string;
  errors?: Record<string, string>;
}) {
  function update(key: string, text: string) {
    onChange(rows.map((r) => (r._key === key ? { ...r, text } : r)));
  }
  function remove(key: string) {
    onChange(rows.filter((r) => r._key !== key));
  }
  function toggleKey(key: string) {
    onChange(rows.map((r) => ({ ...r, isKey: r._key === key ? !r.isKey : false })));
  }
  function add() {
    onChange([...rows, { _key: newKey(), text: "", isKey: false }]);
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
          <label className="mt-2 flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600">
            <input
              type="checkbox"
              checked={row.isKey}
              onChange={() => toggleKey(row._key)}
              className="h-3.5 w-3.5"
            />
            {keyLabel}
          </label>
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
