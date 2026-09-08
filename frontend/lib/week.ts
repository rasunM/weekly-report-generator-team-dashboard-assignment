// Mirrors backend/src/common/utils/week.ts exactly (Monday -> Sunday, UTC-based) so "this week" on
// the dashboard means the same date range the backend uses everywhere else (e.g. dashboard.service.ts
// on the manager side). Kept as a byte-for-byte port rather than reinventing the week math.
export function startOfIsoWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export function endOfIsoWeek(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() + 6);
  return d;
}

/** YYYY-MM-DD for the Monday of the current ISO week, for comparing against a report's weekStart. */
export function currentWeekStartDateOnly(): string {
  return startOfIsoWeek(new Date()).toISOString().slice(0, 10);
}

/** Strips an ISO datetime string down to just its YYYY-MM-DD date part. */
export function toDateOnly(isoString: string): string {
  return isoString.slice(0, 10);
}

/** YYYY-MM-DD for the Sunday of the current ISO week - used as a default weekEnd on the new-report form. */
export function currentWeekEndDateOnly(): string {
  return endOfIsoWeek(startOfIsoWeek(new Date())).toISOString().slice(0, 10);
}
