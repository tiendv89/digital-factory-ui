import { FEATURE_STATUS_OPTIONS, type FeatureStatus } from "./status";

const STORAGE_KEY = "dashboard:board-feature-status-filter";

const VALID_FEATURE_STATUSES = new Set<string>(
  FEATURE_STATUS_OPTIONS.map((s) => s.key),
);

function isValidFeatureStatusArray(value: unknown): value is FeatureStatus[] {
  return (
    Array.isArray(value) &&
    value.every((v) => typeof v === "string" && VALID_FEATURE_STATUSES.has(v))
  );
}

export function getDefaultFeatureStatusFilter(): FeatureStatus[] {
  return FEATURE_STATUS_OPTIONS.filter((s) => s.key !== "done").map(
    (s) => s.key,
  );
}

export function getStoredFeatureStatusFilter(): FeatureStatus[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
  } catch {
    // Ignore storage failures so the board remains usable in restricted browsers.
  }
}
