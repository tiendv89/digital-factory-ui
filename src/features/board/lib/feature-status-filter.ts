import { FEATURE_STATUS_OPTIONS, type FeatureStatus } from "./status";

export function getAllFeatureStatusFilterKeys(): FeatureStatus[] {
  return FEATURE_STATUS_OPTIONS.map((s) => s.key);
}

export function isAllFeatureStatusFilterSelected(
  selectedStatuses: readonly string[],
): boolean {
  const selected = new Set(selectedStatuses);
  return getAllFeatureStatusFilterKeys().every((s) => selected.has(s));
}

export function toggleAllFeatureStatusFilter(
  selectedStatuses: readonly string[],
): FeatureStatus[] {
  return isAllFeatureStatusFilterSelected(selectedStatuses)
    ? []
    : getAllFeatureStatusFilterKeys();
}

export function toggleFeatureStatusFilter(
  selectedStatuses: readonly string[],
  status: string,
): string[] {
  const next = new Set(selectedStatuses);
  if (next.has(status)) {
    next.delete(status);
  } else {
    next.add(status);
  }
  return Array.from(next);
}
