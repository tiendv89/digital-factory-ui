import type {
  ApiError,
  FeatureDetail,
  FeatureSummary,
  ImportWorkspaceRequest,
  PagedFeatures,
  PagedTasks,
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
  type ResponseBody = { success: boolean; data?: unknown; error?: ApiError };
  let body: ResponseBody | null = null;
  try {
    body = text ? (JSON.parse(text) as ResponseBody) : null;
  } catch {
    if (!res.ok) {
      throw { code: "PARSE_ERROR", message: `Non-JSON response (${res.status})`, retryable: res.status >= 500 } as ApiError;
    }
  }

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
  const result = await request<FeatureSummary[] | PagedFeatures>(
    `/api/workspaces/${workspaceId}/features${qs}`,
  );
  return unwrapItems(result);
}

export async function searchFeaturesPage(
  workspaceId: string,
  params?: URLSearchParams,
): Promise<PagedFeatures> {
  const qs = params?.toString() ? `?${params.toString()}` : "";
  const result = await request<FeatureSummary[] | PagedFeatures>(
    `/api/workspaces/${workspaceId}/features${qs}`,
  );
  return normalizePagedFeatures(result);
}

export async function getFeature(workspaceId: string, featureId: string): Promise<FeatureDetail> {
  return request<FeatureDetail>(`/api/workspaces/${workspaceId}/features/${featureId}`);
}

export async function searchWorkspaceTasks(
  workspaceId: string,
  params?: URLSearchParams,
): Promise<TaskSummary[]> {
  const qs = params?.toString() ? `?${params.toString()}` : "";
  const result = await request<TaskSummary[] | PagedTasks>(
    `/api/workspaces/${workspaceId}/tasks${qs}`,
  );
  return unwrapItems(result);
}

export async function searchWorkspaceTasksPage(
  workspaceId: string,
  params?: URLSearchParams,
): Promise<PagedTasks> {
  const qs = params?.toString() ? `?${params.toString()}` : "";
  const result = await request<TaskSummary[] | PagedTasks>(
    `/api/workspaces/${workspaceId}/tasks${qs}`,
  );
  return normalizePagedTasks(result);
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
  const result = await request<TaskSummary[] | PagedTasks>(
    `/api/workspaces/${workspaceId}/features/${featureId}/tasks${qs}`,
  );
  return unwrapItems(result);
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

export async function searchFeaturesPage(
  workspaceId: string,
  params?: URLSearchParams,
): Promise<PagedFeatures> {
  const qs = params?.toString() ? `?${params.toString()}` : "";
  const result = await request<FeatureSummary[] | PagedFeatures>(
    `/api/workspaces/${workspaceId}/features${qs}`,
  );
  return asPagedResponse(result);
}

export async function searchWorkspaceTasksPage(
  workspaceId: string,
  params?: URLSearchParams,
): Promise<PagedTasks> {
  const qs = params?.toString() ? `?${params.toString()}` : "";
  const result = await request<TaskSummary[] | PagedTasks>(
    `/api/workspaces/${workspaceId}/tasks${qs}`,
  );
  return asPagedResponse(result);
}

function asPagedResponse<T>(
  result: T[] | { items: T[]; total?: number; page?: number; limit?: number },
): { items: T[]; total: number; page: number; limit: number } {
  if (Array.isArray(result)) {
    return { items: result, total: result.length, page: 1, limit: result.length };
  }
  return {
    items: result.items,
    total: result.total ?? result.items.length,
    page: result.page ?? 1,
    limit: result.limit ?? result.items.length,
  };
}

function unwrapItems<T>(result: T[] | { items: T[] }): T[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === "object" && Array.isArray(result.items)) {
    return result.items;
  }
  throw new Error("Expected API response data to be an array or a paged { items } object");
}

function normalizePagedFeatures(
  result: FeatureSummary[] | PagedFeatures,
): PagedFeatures {
  if (Array.isArray(result)) {
    return { items: result, total: result.length, page: 1, limit: result.length };
  }
  if (
    result &&
    typeof result === "object" &&
    Array.isArray(result.items) &&
    typeof result.total === "number" &&
    typeof result.page === "number" &&
    typeof result.limit === "number"
  ) {
    return result as PagedFeatures;
  }
  throw new Error(
    "Expected API response data to be an array or a valid PagedFeatures object",
  );
}

function normalizePagedTasks(
  result: TaskSummary[] | PagedTasks,
): PagedTasks {
  if (Array.isArray(result)) {
    return { items: result, total: result.length, page: 1, limit: result.length };
  }
  if (
    result &&
    typeof result === "object" &&
    Array.isArray(result.items) &&
    typeof result.total === "number" &&
    typeof result.page === "number" &&
    typeof result.limit === "number"
  ) {
    return result as PagedTasks;
  }
  throw new Error(
    "Expected API response data to be an array or a valid PagedTasks object",
  );
}
