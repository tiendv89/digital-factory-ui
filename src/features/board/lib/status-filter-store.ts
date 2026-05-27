import { FEATURE_STATUS_OPTIONS, STATUS_COLUMNS, type FeatureStatus, type TaskStatus } from "./status";

const TASK_STORAGE_KEY = "dashboard:board-status-filter";
const FEATURE_STORAGE_KEY = "dashboard:board-feature-status-filter";
const BOARD_MODE_STORAGE_KEY = "dashboard:board-mode";

const VALID_TASK_STATUSES = new Set<string>(STATUS_COLUMNS.map((s) => s.key));
const VALID_FEATURE_STATUSES = new Set<string>(
  FEATURE_STATUS_OPTIONS.map((s) => s.key),
);
const VALID_BOARD_MODES = new Set(["task", "feature"]);

function isValidTaskStatusArray(value: unknown): value is TaskStatus[] {
  return (
    Array.isArray(value) &&
    value.every((v) => typeof v === "string" && VALID_TASK_STATUSES.has(v))
  );
}

function isValidFeatureStatusArray(value: unknown): value is FeatureStatus[] {
  return (
    Array.isArray(value) &&
    value.every((v) => typeof v === "string" && VALID_FEATURE_STATUSES.has(v))
  );
}

export function getDefaultStatusFilter(): TaskStatus[] {
  return STATUS_COLUMNS.filter((s) => s.key !== "done").map((s) => s.key);
}

export function getStoredStatusFilter(): TaskStatus[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TASK_STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidTaskStatusArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStatusFilter(statuses: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(statuses));
  } catch {
    // Ignore storage failures so the board remains usable in restricted browsers.
  }
}

export function getDefaultFeatureStatusFilter(): FeatureStatus[] {
  return FEATURE_STATUS_OPTIONS.filter((s) => s.key !== "done").map(
    (s) => s.key,
  );
}

export function getStoredFeatureStatusFilter(): FeatureStatus[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FEATURE_STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidFeatureStatusArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveFeatureStatusFilter(statuses: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FEATURE_STORAGE_KEY, JSON.stringify(statuses));
  } catch {
    // Ignore storage failures so the board remains usable in restricted browsers.
  }
}

export function clearStatusFilter(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TASK_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function clearFeatureStatusFilter(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(FEATURE_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export type BoardMode = "task" | "feature";

export function getDefaultBoardMode(): BoardMode {
  return "task";
}

export function getStoredBoardMode(): BoardMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BOARD_MODE_STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "string" && VALID_BOARD_MODES.has(parsed)
      ? (parsed as BoardMode)
      : null;
  } catch {
    return null;
  }
}

export function saveBoardMode(mode: BoardMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BOARD_MODE_STORAGE_KEY, JSON.stringify(mode));
  } catch {
    // Ignore storage failures.
  }
}

export function clearBoardMode(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(BOARD_MODE_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
