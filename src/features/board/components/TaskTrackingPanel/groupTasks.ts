import type { ParsedFeature } from "@/services/yaml-parser";
import type { ActiveFilters } from "../../types";
import {
  TRACKED_SECTIONS,
  type TrackedSection,
  type TrackedStatus,
} from "./TaskTrackingPanel.types";

const SIDEBAR_STATUSES = new Set<TrackedStatus>([
  "blocked",
  "in_progress",
  "in_review",
  "ready",
]);

function parseTimestampMs(timestamp: string | undefined): number | null {
  if (!timestamp) return null;
  const ms = new Date(timestamp).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function getTaskTimeMs(task: ParsedFeature["tasks"][number]): number | null {
  let latest = parseTimestampMs(task.execution?.last_updated_at);

  for (const entry of task.log ?? []) {
    const entryMs = parseTimestampMs(entry.at);
    if (entryMs === null) continue;
    if (latest === null || entryMs > latest) {
      latest = entryMs;
    }
  }

  return latest;
}

function sortNewestTaskFirst(
  a: TrackedSection["items"][number],
  b: TrackedSection["items"][number],
): number {
  const aTime = getTaskTimeMs(a.task);
  const bTime = getTaskTimeMs(b.task);

  if (aTime !== null && bTime !== null && aTime !== bTime) {
    return bTime - aTime;
  }
  if (aTime !== null && bTime === null) return -1;
  if (aTime === null && bTime !== null) return 1;

  return 0;
}

function matchesQuery(
  task: ParsedFeature["tasks"][number],
  feature: ParsedFeature,
  query: string,
): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    task.title.toLowerCase().includes(q) ||
    task.id.toLowerCase().includes(q) ||
    feature.title.toLowerCase().includes(q) ||
    feature.id.toLowerCase().includes(q)
  );
}

export function groupTrackedTasks(
  features: ParsedFeature[],
  searchQuery = "",
  activeFilters: ActiveFilters = { statuses: [] },
): TrackedSection[] {
  const buckets = new Map<TrackedStatus, TrackedSection>();
  for (const { status, label } of TRACKED_SECTIONS) {
    buckets.set(status, { status, label, items: [] });
  }

  for (const feature of features) {
    for (const task of feature.tasks) {
      const status = task.status as TrackedStatus;
      if (!SIDEBAR_STATUSES.has(status)) continue;
      if (
        activeFilters.statuses.length > 0 &&
        !activeFilters.statuses.includes(task.status)
      )
        continue;
      if (!matchesQuery(task, feature, searchQuery)) continue;

      const bucket = buckets.get(status);
      if (bucket) {
        bucket.items.push({ task, feature });
      }
    }
  }

  return TRACKED_SECTIONS.map(({ status }) => {
    const section = buckets.get(status)!;
    return {
      ...section,
      items: [...section.items].sort(sortNewestTaskFirst),
    };
  });
}
