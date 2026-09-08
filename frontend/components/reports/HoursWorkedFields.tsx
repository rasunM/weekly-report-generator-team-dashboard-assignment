"use client";

// Section 7 ("Hours Worked") - a fixed set of 5 categories matching backend/src/modules/reports/
// reports.dto.ts `hoursEntrySchema`'s HourType enum exactly. Unlike Tasks/Blockers/Achievements,
// these rows are NOT dynamic - the categories themselves are part of the fixed report structure.
import type { HourType } from "@/types/report";
import Input from "@/components/common/Input";

const ORDER: HourType[] = ["DEVELOPMENT", "TESTING", "MEETINGS", "DOCUMENTATION", "OTHER"];
const LABELS: Record<HourType, string> = {
  DEVELOPMENT: "Development",
  TESTING: "Testing",
  MEETINGS: "Meetings",
  DOCUMENTATION: "Documentation",
  OTHER: "Other",
};

export type HoursByType = Record<HourType, number>;

export function emptyHours(): HoursByType {
  return { DEVELOPMENT: 0, TESTING: 0, MEETINGS: 0, DOCUMENTATION: 0, OTHER: 0 };
}

export default function HoursWorkedFields({
  value,
  onChange,
}: {
  value: HoursByType;
  onChange: (value: HoursByType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {ORDER.map((type) => (
        <Input
          key={type}
          label={LABELS[type]}
          type="number"
          min={0}
          max={168}
          step={0.5}
          value={value[type]}
          onChange={(e) => {
            const n = Number(e.target.value);
            const clamped = Number.isNaN(n) ? 0 : Math.min(168, Math.max(0, n));
            onChange({ ...value, [type]: clamped });
          }}
        />
      ))}
    </div>
  );
}
