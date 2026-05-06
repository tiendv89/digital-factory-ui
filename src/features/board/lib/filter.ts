import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";
import type { ActiveFilters } from "../types";
import { STATUS_KEYS, normalizeStatus, type StatusKey } from "./status";

export function matchesSearch(task: ParsedTask, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    task.id.toLowerCase().includes(q) ||
    task.title.toLowerCase().includes(q)
  );
}

export function matchesStatusFilter(
  task: ParsedTask,
  filters: ActiveFilters,
): boolean {
  if (!filters.statuses || filters.statuses.length === 0) return true;
  return filters.statuses.includes(task.status);
}

export function filterFeatureTasks(
  feature: ParsedFeature,
  query: string,
  filters: ActiveFilters,
): ParsedTask[] {
  return feature.tasks.filter(
    (t) => matchesSearch(t, query) && matchesStatusFilter(t, filters),
  );
}

export function bucketTasksByStatus(
  tasks: ParsedTask[],
): Record<StatusKey, ParsedTask[]> {
  const buckets = STATUS_KEYS.reduce(
    (acc, key) => {
      acc[key] = [];
      return acc;
    },
    {} as Record<StatusKey, ParsedTask[]>,
  );
  for (const task of tasks) {
    const key = normalizeStatus(task.status);
    buckets[key].push(task);
  }
  return buckets;
}

export type TaskSegment = {
  status: StatusKey;
  count: number;
};

export function buildTaskSegments(tasks: ParsedTask[]): TaskSegment[] {
  const buckets = bucketTasksByStatus(tasks);
  return STATUS_KEYS.filter((key) => buckets[key].length > 0).map((status) => ({
    status,
    count: buckets[status].length,
  }));
}

export type FeatureProgress = {
  done: number;
  total: number;
};

export function computeProgress(tasks: ParsedTask[]): FeatureProgress {
  const total = tasks.length;
  const done = tasks.filter((t) => normalizeStatus(t.status) === "done").length;
  return { done, total };
}
