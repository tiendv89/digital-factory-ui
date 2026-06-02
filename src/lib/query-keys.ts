import type { TaskSearchParams, FeatureSearchParams } from "@/services/workflow-backend/query-params";

export type QueryKey = readonly unknown[];

function normalizeTaskParams(
  params: TaskSearchParams,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  if (params.task_id) normalized.task_id = params.task_id;
  if (params.title) normalized.title = params.title;
  if (params.status !== undefined) {
    normalized.status = Array.isArray(params.status)
      ? [...params.status].sort().join(",")
      : params.status;
  }
  if (params.repo) normalized.repo = params.repo;
  if (params.sort) normalized.sort = params.sort;
  if (params.page !== undefined) normalized.page = params.page;
  if (params.limit !== undefined) normalized.limit = params.limit;
  return normalized;
}

function normalizeFeatureParams(
  params: FeatureSearchParams,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  if (params.title) normalized.title = params.title;
  if (params.status !== undefined) {
    normalized.status = Array.isArray(params.status)
      ? [...params.status].sort().join(",")
      : params.status;
  }
  if (params.sort) normalized.sort = params.sort;
  if (params.page !== undefined) normalized.page = params.page;
  if (params.limit !== undefined) normalized.limit = params.limit;
  return normalized;
}

export const workspaceKeys = {
  detail: (workspaceId: string): QueryKey =>
    ["workspace", workspaceId, "detail"] as const,

  sidebarTasks: (workspaceId: string, params?: URLSearchParams): QueryKey =>
    [
      "workspace",
      workspaceId,
      "sidebar-tasks",
      params ? params.toString() : "",
    ] as const,

  tasks: (workspaceId: string, params: TaskSearchParams): QueryKey =>
    [
      "workspace",
      workspaceId,
      "tasks",
      normalizeTaskParams(params),
    ] as const,

  features: (workspaceId: string, params: FeatureSearchParams): QueryKey =>
    [
      "workspace",
      workspaceId,
      "features",
      normalizeFeatureParams(params),
    ] as const,

  task: (workspaceId: string, taskId: string): QueryKey =>
    ["workspace", workspaceId, "task", taskId] as const,

  feature: (workspaceId: string, featureId: string): QueryKey =>
    ["workspace", workspaceId, "feature", featureId] as const,

  featureTask: (
    workspaceId: string,
    featureId: string,
    taskId: string,
  ): QueryKey =>
    ["workspace", workspaceId, "feature", featureId, "task", taskId] as const,

  activity: (workspaceId: string): QueryKey =>
    ["workspace", workspaceId, "activity", "client"] as const,

  all: (workspaceId: string): QueryKey =>
    ["workspace", workspaceId] as const,
};
