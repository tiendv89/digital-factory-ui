import type {
  WorkspaceDetail,
  FeatureSummary,
  TaskSummary,
  ImportWorkspaceRequest,
  LocalWorkspaceSummary,
} from "@/services/workflow-backend";
import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";

export function adaptTaskSummary(task: TaskSummary): ParsedTask {
  return {
    id: task.task_name,
    title: task.title,
    status: task.status,
    dependsOn: [],
    branch: task.branch || undefined,
    pr: task.pr ? { url: task.pr.url, status: task.pr.status } : undefined,
    workspace_pr: task.workspace_pr
      ? { url: task.workspace_pr.url, status: task.workspace_pr.status }
      : undefined,
    blockedReason: task.is_blocked ? "blocked" : undefined,
    backendId: task.id,
    featureBackendId: task.feature_id || undefined,
    repo: task.repo || undefined,
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
    featureStatus: feature.status,
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

export function adaptTaskSummariesToFeatures(tasks: TaskSummary[]): ParsedFeature[] {
  const featureMap = new Map<string, { feature: ParsedFeature; order: number }>();
  let order = 0;

  for (const task of tasks) {
    const featureKey = task.feature_id || task.feature_name || "unknown";
    if (!featureMap.has(featureKey)) {
      featureMap.set(featureKey, {
        feature: {
          id: task.feature_name || featureKey,
          title: task.feature_name || featureKey,
          featureStatus: "unknown",
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

export function adaptFeatureSummaries(features: FeatureSummary[]): ParsedFeature[] {
  return features.map((f) => ({
    id: f.feature_name,
    title: f.title,
    featureStatus: f.status,
    tasks: [],
    backendId: f.id,
    currentStage: f.current_stage,
    taskCounts: f.task_counts,
    updatedAt: f.updated_at,
  }));
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
