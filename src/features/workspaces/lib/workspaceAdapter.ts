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
  };
}

export function adaptWorkspaceDetail(detail: WorkspaceDetail): ParsedFeature[] {
  return detail.features.map((f) => adaptFeatureSummary(f, detail.tasks));
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
