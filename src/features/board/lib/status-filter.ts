import {
  FEATURE_MODE_STATUSES,
  TASK_MODE_STATUSES,
  type FeatureStatus,
  type TaskStatus,
} from "./status";

export function getAllStatusFilterKeys(): TaskStatus[] {
  return [...TASK_MODE_STATUSES];
}

export function isAllStatusFilterSelected(
  selectedStatuses: readonly string[],
): boolean {
  const selected = new Set(selectedStatuses);
  return TASK_MODE_STATUSES.every((status) => selected.has(status));
}

export function toggleAllStatusFilter(
  selectedStatuses: readonly string[],
): TaskStatus[] {
  return isAllStatusFilterSelected(selectedStatuses)
    ? []
    : getAllStatusFilterKeys();
}

export function toggleStatusFilter(
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

export function getAllFeatureStatusFilterKeys(): FeatureStatus[] {
  return [...FEATURE_MODE_STATUSES];
}

export function isAllFeatureStatusFilterSelected(
  selectedStatuses: readonly string[],
): boolean {
  const selected = new Set(selectedStatuses);
  return FEATURE_MODE_STATUSES.every((status) => selected.has(status));
}

export function toggleAllFeatureStatusFilter(
  selectedStatuses: readonly string[],
): FeatureStatus[] {
  return isAllFeatureStatusFilterSelected(selectedStatuses)
    ? []
    : getAllFeatureStatusFilterKeys();
}
