import type { FeatureSummary, FeatureWithTasks, PullRequestRef, TaskSummary, TaskSummaryWithUpdatedAt, WorkspaceDetail } from "@/services/workflow-backend";
import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";

function adaptPullRequestRef(ref: PullRequestRef | null | undefined) {
  return ref?.url ? { url: ref.url, status: ref.status ?? "" } : undefined;
}

/** Feature lifecycle statuses that are valid for feature-level display. */
const FEATURE_LIFECYCLE_STATUSES = ["in_design", "in_tdd", "ready_for_implementation", "in_implementation", "in_handoff", "done", "blocked", "cancelled"] as const;

type FeatureLifecycleStatus = (typeof FEATURE_LIFECYCLE_STATUSES)[number];

const FEATURE_LIFECYCLE_STATUS_SET: ReadonlySet<string> = new Set(FEATURE_LIFECYCLE_STATUSES);

function isFeatureLifecycleStatus(value: string): value is FeatureLifecycleStatus {
  return FEATURE_LIFECYCLE_STATUS_SET.has(value);
}

function normalizeFeatureLifecycleStatus(value: string): FeatureLifecycleStatus | "unknown" {
  return isFeatureLifecycleStatus(value) ? value : "unknown";
}

function adaptTaskSummary(task: TaskSummary | TaskSummaryWithUpdatedAt): ParsedTask {
  const blockedReason = task.blocked_reason && task.blocked_reason.trim() !== "" ? task.blocked_reason : task.is_blocked ? "blocked" : undefined;

  const withUpdatedAt = task as TaskSummaryWithUpdatedAt;

  return {
    id: task.task_name,
    title: task.title,
    status: task.status,
    dependsOn: task.depends_on ?? [],
    ...(typeof task.description === "string" && task.description.trim() !== "" ? { description: task.description } : {}),
    ...(typeof task.priority === "string" && task.priority.trim() !== "" ? { priority: task.priority } : {}),
    ...(task.execution ? { execution: task.execution } : {}),
    branch: task.branch || undefined,
    pr: adaptPullRequestRef(task.pr),
    workspace_pr: adaptPullRequestRef(task.workspace_pr),
    ...(blockedReason ? { blockedReason } : {}),
    ...(task.blocked_context ? { blockedContext: task.blocked_context } : {}),
    ...(task.log ? { log: task.log } : {}),
    backendId: task.id,
    featureBackendId: task.feature_id || undefined,
    repo: task.repo || undefined,
    ...(withUpdatedAt.updated_at ? { updatedAt: withUpdatedAt.updated_at } : {}),
  };
}

export function adaptFeatureWithTasksToFeatures(features: FeatureWithTasks[]): ParsedFeature[] {
  return features.map((f) => ({
    id: f.feature_name,
    title: f.title,
    featureStatus: normalizeFeatureLifecycleStatus(f.status),
    tasks: f.tasks.map(adaptTaskSummary),
    backendId: f.feature_id,
    currentStage: f.current_stage,
    taskCounts: f.task_counts,
    updatedAt: f.updated_at,
  }));
}

function adaptFeatureSummary(feature: FeatureSummary, tasks: TaskSummary[]): ParsedFeature {
  const featureTasks = tasks.filter((t) => t.feature_id === feature.feature_id).map(adaptTaskSummary);

  return {
    id: feature.feature_name,
    title: feature.title,
    featureStatus: normalizeFeatureLifecycleStatus(feature.status),
    tasks: featureTasks,
    backendId: feature.feature_id,
    currentStage: feature.current_stage,
    taskCounts: feature.task_counts,
    updatedAt: feature.updated_at,
  };
}

export function adaptWorkspaceDetail(detail: WorkspaceDetail): ParsedFeature[] {
  return detail.features.map((f) => adaptFeatureSummary(f, detail.tasks));
}

/**
 * Convert backend task search results into ParsedFeature objects.
 *
 * Feature lifecycle status is read from the optional {@link featureStatuses} map
 * keyed by feature_id. When the map has an entry the status is normalized to a
 * valid feature lifecycle value (or "unknown"). When the map is absent or does
 * not contain the feature_id, `featureStatus` falls back to "unknown".
 *
 * Task lifecycle values (todo, ready, in_progress, in_review) are **never**
 * used to derive a feature-level status.
 */
export function adaptTaskSummariesToFeatures(tasks: TaskSummary[], featureStatuses?: ReadonlyMap<string, string>): ParsedFeature[] {
  const featureMap = new Map<string, { feature: ParsedFeature; order: number }>();
  let order = 0;

  for (const task of tasks) {
    const featureKey = task.feature_id || task.feature_name || "unknown";
    if (!featureMap.has(featureKey)) {
      const rawStatus = featureStatuses?.get(task.feature_id ?? "");
      featureMap.set(featureKey, {
        feature: {
          id: task.feature_name || featureKey,
          title: task.feature_name || featureKey,
          featureStatus: normalizeFeatureLifecycleStatus(rawStatus ?? ""),
          tasks: [],
        },
        order: order++,
      });
    }
    featureMap.get(featureKey)!.feature.tasks.push(adaptTaskSummary(task));
  }

  return [...featureMap.values()].sort((a, b) => a.order - b.order).map((entry) => entry.feature);
}

export function adaptFeatureSummaries(features: FeatureSummary[]): ParsedFeature[] {
  return features.map((f) => ({
    id: f.feature_name,
    title: f.title,
    featureStatus: normalizeFeatureLifecycleStatus(f.status),
    tasks: [],
    backendId: f.feature_id,
    currentStage: f.current_stage,
    taskCounts: f.task_counts,
    updatedAt: f.updated_at,
  }));
}
