import { STATUS_COLUMNS, type TaskStatus } from "./status";

export function getAllStatusFilterKeys(): TaskStatus[] {
  return STATUS_COLUMNS.map((status) => status.key);
}

export function isAllStatusFilterSelected(
  selectedStatuses: readonly string[],
): boolean {
  const selected = new Set(selectedStatuses);
  return getAllStatusFilterKeys().every((status) => selected.has(status));
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
