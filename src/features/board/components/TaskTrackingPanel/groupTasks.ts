import type { ParsedFeature } from "@/services/yaml-parser";
import {
  TRACKED_SECTIONS,
  type TrackedSection,
  type TrackedStatus,
} from "./TaskTrackingPanel.types";

function isOpenPullRequestStatus(status: string | undefined): boolean {
  return status?.toLowerCase() === "open";
}

function hasOpenPullRequest(task: ParsedFeature["tasks"][number]): boolean {
  return (
    isOpenPullRequestStatus(task.pr?.status) ||
    isOpenPullRequestStatus(task.workspace_pr?.status)
  );
}

export function groupTrackedTasks(
  features: ParsedFeature[],
): TrackedSection[] {
  const buckets = new Map<TrackedStatus, TrackedSection>();
  for (const { status, label } of TRACKED_SECTIONS) {
    buckets.set(status, { status, label, items: [] });
  }

  for (const feature of features) {
    for (const task of feature.tasks) {
      if (!hasOpenPullRequest(task)) continue;
      
      const bucket = buckets.get(task.status as TrackedStatus);
      if (bucket) {
        bucket.items.push({ task, feature });
      }
    }
  }

  return TRACKED_SECTIONS.map(({ status }) => buckets.get(status)!);
}
