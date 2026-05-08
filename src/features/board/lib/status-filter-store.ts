import { STATUS_COLUMNS, type TaskStatus } from "./status";

const STORAGE_KEY = "dashboard:board-status-filter";

const VALID_STATUSES = new Set<string>(STATUS_COLUMNS.map((s) => s.key));

function isValidStatusArray(value: unknown): value is TaskStatus[] {
  return (
    Array.isArray(value) &&
    value.every((v) => typeof v === "string" && VALID_STATUSES.has(v))
  );
}

export function getDefaultStatusFilter(): TaskStatus[] {
  return STATUS_COLUMNS.filter((s) => s.key !== "done").map((s) => s.key);
}

export function getStoredStatusFilter(): TaskStatus[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidStatusArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStatusFilter(statuses: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
  } catch {
    // Ignore storage failures so the board remains usable in restricted browsers.
  }
}
