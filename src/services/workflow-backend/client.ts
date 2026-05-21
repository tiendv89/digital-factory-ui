import type {
  ApiError,
  FeatureDetail,
  FeatureSummary,
  ImportWorkspaceRequest,
  TaskDetail,
  TaskSummary,
  WorkspaceDetail,
} from "./types";

function getApiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is required for workflow-backend API calls");
  }
  return base;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  const body = text ? (JSON.parse(text) as { success: boolean; data?: unknown; error?: ApiError }) : null;

  if (!res.ok || body?.success === false) {
    throw (body?.error ?? {
      code: "UNKNOWN_ERROR",
      message: "Unknown backend API error",
      retryable: false,
    }) as ApiError;
  }

  return body?.data as T;
}

export async function importWorkspace(body: ImportWorkspaceRequest): Promise<WorkspaceDetail> {
  return request<WorkspaceDetail>("/api/workspaces/import", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getWorkspace(workspaceId: string): Promise<WorkspaceDetail> {
  return request<WorkspaceDetail>(`/api/workspaces/${workspaceId}`);
}

export async function syncWorkspace(workspaceId: string): Promise<WorkspaceDetail> {
  return request<WorkspaceDetail>(`/api/workspaces/${workspaceId}/sync`, { method: "POST" });
}

export async function searchFeatures(
  workspaceId: string,
  params?: URLSearchParams,
): Promise<FeatureSummary[]> {
  const qs = params?.toString() ? `?${params.toString()}` : "";
  return request<FeatureSummary[]>(`/api/workspaces/${workspaceId}/features${qs}`);
}

export async function getFeature(workspaceId: string, featureId: string): Promise<FeatureDetail> {
  return request<FeatureDetail>(`/api/workspaces/${workspaceId}/features/${featureId}`);
}

export async function searchWorkspaceTasks(
  workspaceId: string,
  params?: URLSearchParams,
): Promise<TaskSummary[]> {
  const qs = params?.toString() ? `?${params.toString()}` : "";
  return request<TaskSummary[]>(`/api/workspaces/${workspaceId}/tasks${qs}`);
}

export async function getWorkspaceTask(workspaceId: string, taskId: string): Promise<TaskDetail> {
  return request<TaskDetail>(`/api/workspaces/${workspaceId}/tasks/${taskId}`);
}

export async function searchFeatureTasks(
  workspaceId: string,
  featureId: string,
  params?: URLSearchParams,
): Promise<TaskSummary[]> {
  const qs = params?.toString() ? `?${params.toString()}` : "";
  return request<TaskSummary[]>(`/api/workspaces/${workspaceId}/features/${featureId}/tasks${qs}`);
}

export async function getFeatureTask(
  workspaceId: string,
  featureId: string,
  taskId: string,
): Promise<TaskDetail> {
  return request<TaskDetail>(
    `/api/workspaces/${workspaceId}/features/${featureId}/tasks/${taskId}`,
  );
}
