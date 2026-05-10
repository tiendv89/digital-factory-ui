import type { ParsedFeature } from "@/services/yaml-parser";

export function matchesSearch(feature: ParsedFeature, query: string): boolean {
  return matchesTaskModeSearch(feature, query);
}

export function matchesStatusFilter(
  feature: ParsedFeature,
  statuses: string[],
): boolean {
  return matchesTaskModeStatusFilter(feature, statuses);
}

export function matchesTaskModeSearch(
  feature: ParsedFeature,
  query: string,
): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (feature.title.toLowerCase().includes(q)) return true;
  if (feature.id.toLowerCase().includes(q)) return true;
  return feature.tasks.some(
    (t) =>
      t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q),
  );
}

export function matchesTaskModeStatusFilter(
  feature: ParsedFeature,
  statuses: string[],
): boolean {
  if (statuses.length === 0) return true;
  return feature.tasks.some((t) => statuses.includes(t.status));
}

export function matchesFeatureModeSearch(
  feature: ParsedFeature,
  query: string,
): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    feature.title.toLowerCase().includes(q) ||
    feature.id.toLowerCase().includes(q)
  );
}

export function matchesFeatureModeStatusFilter(
  feature: ParsedFeature,
  statuses: string[],
): boolean {
  if (statuses.length === 0) return false;
  return statuses.includes(feature.featureStatus);
}
