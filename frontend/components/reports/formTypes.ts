// UI-only row shapes for the dynamic list editors below - each carries a client-side `_key` for
// stable React list keys, stripped back out to the plain wire shape (TaskEntry/FlaggableEntry/
// plain string) before the payload is sent to the API. Never sent to the backend as-is.
import type { FlaggableEntry, TaskEntry } from "@/types/report";

export interface TaskRow extends TaskEntry {
  _key: string;
}

export interface TextRow {
  _key: string;
  text: string;
}

export interface FlaggableRow extends FlaggableEntry {
  _key: string;
}

let counter = 0;
export function newKey(): string {
  counter += 1;
  return `row-${Date.now()}-${counter}`;
}
