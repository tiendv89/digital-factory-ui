import type {
  ActivityEvent,
  FeatureDetail,
  WorkspaceDetail,
  FeatureSummary,
  TaskDetail,
  TaskSummary,
  ImportWorkspaceRequest,
  LocalWorkspaceSummary,
  PullRequestRef,
} from "@/services/workflow-backend";
import type {
  LogEntry,
  ParsedFeature,
  ParsedFeatureActivityEntry,
  ParsedTask,
} from "@/services/yaml-parser";

function adaptPullRequestRef(ref: PullRequestRef | null | undefined) {
  return ref?.url ? { url: ref.url, status: ref.status ?? "" } : undefined;
}

function adaptActivityEvent(event: ActivityEvent): LogEntry {
  return {
    action: event.action,
    by: event.actor,
    at: event.occurred_at,
    ...(event.note ? { note: event.note } : {}),
  };
}

function adaptFeatureActivity(
  feature: FeatureDetail,
): ParsedFeatureActivityEntry[] | undefined {
  if (!feature.activity) return undefined;

  const tasksByBackendId = new Map(
    feature.tasks.map((task) => [task.id, task]),
  );

  return feature.activity.map((event) => {
    const task = event.task_id
      ? tasksByBackendId.get(event.task_id)
      : undefined;
    return {
      ...adaptActivityEvent(event),
      targetId: task?.task_name ?? event.task_id ?? feature.feature_name,
      targetTitle: task?.title ?? feature.title,
      ...(event.scope ? { scope: event.scope } : {}),
    };
  });
}

function findWorkspacePullRequestRef(
  task: TaskDetail,
): PullRequestRef | null | undefined {
  return (
    task.workspace_pr ??
    (task.pr_refs ?? []).find((ref) =>
      ref.label?.toLowerCase().includes("workspace"),
    )
  );
}

function findRepositoryPullRequestRef(
  task: TaskDetail,
): PullRequestRef | null | undefined {
  if (task.pr) return task.pr;

  const workspacePr = findWorkspacePullRequestRef(task);
  return (task.pr_refs ?? []).find((ref) => ref.url !== workspacePr?.url);
}

/** Feature lifecycle statuses that are valid for feature-level display. */
export const FEATURE_LIFECYCLE_STATUSES = [
  "in_design",
  "in_tdd",
  "ready_for_implementation",
  "in_implementation",
  "in_handoff",
  "done",
  "blocked",
  "cancelled",
] as const;

export type FeatureLifecycleStatus =
  (typeof FEATURE_LIFECYCLE_STATUSES)[number];

const FEATURE_LIFECYCLE_STATUS_SET: ReadonlySet<string> = new Set(
  FEATURE_LIFECYCLE_STATUSES,
);

export function isFeatureLifecycleStatus(
  value: string,
): value is FeatureLifecycleStatus {
  return FEATURE_LIFECYCLE_STATUS_SET.has(value);
}

export function normalizeFeatureLifecycleStatus(
  value: string,
): FeatureLifecycleStatus | "unknown" {
  return isFeatureLifecycleStatus(value) ? value : "unknown";
}

export function adaptTaskSummary(task: TaskSummary): ParsedTask {
  const blockedReason =
    task.blocked_reason && task.blocked_reason.trim() !== ""
      ? task.blocked_reason
      : task.is_blocked
        ? "blocked"
        : undefined;

  return {
    id: task.task_name,
    title: task.title,
    status: task.status,
    dependsOn: task.depends_on ?? [],
    ...(typeof task.description === "string" && task.description.trim() !== ""
      ? { description: task.description }
      : {}),
    ...(typeof task.priority === "string" && task.priority.trim() !== ""
      ? { priority: task.priority }
      : {}),
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
  };
}

export function adaptTaskDetail(task: TaskDetail): ParsedTask {
  return {
    ...adaptTaskSummary(task),
    pr: adaptPullRequestRef(findRepositoryPullRequestRef(task)),
    workspace_pr: adaptPullRequestRef(findWorkspacePullRequestRef(task)),
    dependsOn: task.depends_on ?? [],
    log: task.activity ? task.activity.map(adaptActivityEvent) : task.log,
    ...(task.blocked_reason ? { blockedReason: task.blocked_reason } : {}),
  };
}

export function adaptFeatureSummary(
  feature: FeatureSummary,
  tasks: TaskSummary[],
): ParsedFeature {
  const featureTasks = tasks
    .filter((t) => t.feature_id === feature.id)
    .map(adaptTaskSummary);

  return {
    id: feature.feature_name,
    title: feature.title,
    featureStatus: normalizeFeatureLifecycleStatus(feature.status),
    tasks: featureTasks,
    backendId: feature.id,
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
export function adaptTaskSummariesToFeatures(
  tasks: TaskSummary[],
  featureStatuses?: ReadonlyMap<string, string>,
): ParsedFeature[] {
  const featureMap = new Map<
    string,
    { feature: ParsedFeature; order: number }
  >();
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

  return [...featureMap.values()]
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.feature);
}

export function adaptFeatureSummaries(
  features: FeatureSummary[],
): ParsedFeature[] {
  return features.map((f) => ({
    id: f.feature_name,
    title: f.title,
    featureStatus: normalizeFeatureLifecycleStatus(f.status),
    tasks: [],
    backendId: f.id,
    currentStage: f.current_stage,
    taskCounts: f.task_counts,
    updatedAt: f.updated_at,
  }));
}

export function adaptFeatureDetail(feature: FeatureDetail): ParsedFeature {
  return {
    id: feature.feature_name,
    title: feature.title,
    featureStatus: normalizeFeatureLifecycleStatus(feature.status),
    tasks: feature.tasks.map(adaptTaskSummary),
    activity: adaptFeatureActivity(feature),
    backendId: feature.id,
    currentStage: feature.current_stage,
    taskCounts: feature.task_counts,
    updatedAt: feature.updated_at,
  };
}

export function buildImportLocalSummary(
  detail: WorkspaceDetail,
  body: ImportWorkspaceRequest,
  now: string,
): LocalWorkspaceSummary {
  const urlParts = body.repo_url.replace(/\.git$/, "").split("/");
  const repoName = urlParts[urlParts.length - 1] ?? body.repo_url;
  return {
    workspaceId: detail.id,
    name: detail.name || body.name || repoName,
    repo_url: body.repo_url,
    default_branch: body.default_branch ?? "main",
    last_opened_at: now,
  };
}
