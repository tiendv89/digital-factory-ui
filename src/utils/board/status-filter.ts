import { FEATURE_MODE_STATUSES } from "./status";

export function isAllFeatureStatusFilterSelected(selectedStatuses: readonly string[]): boolean {
  const selected = new Set(selectedStatuses);
  return FEATURE_MODE_STATUSES.every((status) => selected.has(status));
}
