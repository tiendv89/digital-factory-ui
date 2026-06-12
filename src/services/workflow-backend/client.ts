import axios from "axios";

import { workflowApi } from "@/constants/axios";

import type {
  ActivityEvent,
  ApiError,
  CreateFeatureRequest,
  CreateWorkspaceRequest,
  FeatureDetail,
  FeatureSummary,
  FeatureTaskPage,
  ImportWorkspaceRequest,
  PagedFeatures,
  PagedTasks,
  TaskSummary,
  WorkspaceDetail,
  WorkspaceSummary,
} from "./types";

type ResponseBody<T> = { success: boolean; data?: T; error?: ApiError };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method?.toUpperCase() ?? "GET") as "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  const data = init?.body !== undefined ? (typeof init.body === "string" ? (JSON.parse(init.body) as unknown) : init.body) : undefined;

  try {
    const res = await workflowApi.request<ResponseBody<T>>({ url: path, method, data });
    const body = res.data;
    if (body?.success === false) {
      throw body.error ?? ({ code: "UNKNOWN_ERROR", message: "Unknown backend API error", retryable: false } as ApiError);
    }
    return body.data as T;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const body = err.response?.data as ResponseBody<T> | undefined;
      throw (
        body?.error ??
        ({
          code: "UNKNOWN_ERROR",
          message: `Request failed (${err.response?.status ?? "network"})`,
          retryable: (err.response?.status ?? 0) >= 500,
        } as ApiError)
      );
    }
    throw err;
  }
}

export async function listWorkspaces(orgId?: string): Promise<WorkspaceSummary[]> {
  const path = orgId ? `/api/workspaces?org=${encodeURIComponent(orgId)}` : "/api/workspaces";
  return request<WorkspaceSummary[]>(path);
}

export async function importWorkspace(body: ImportWorkspaceRequest): Promise<WorkspaceDetail> {
  return request<WorkspaceDetail>("/api/workspaces/import", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createWorkspace(body: CreateWorkspaceRequest): Promise<WorkspaceDetail> {
  return request<WorkspaceDetail>("/api/workspaces", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getWorkspace(workspaceId: string): Promise<WorkspaceDetail> {
  return request<WorkspaceDetail>(`/api/workspaces/${workspaceId}`);
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  await request<void>(`/api/workspaces/${workspaceId}`, { method: "DELETE" });
}

export async function createFeature(workspaceId: string, body: CreateFeatureRequest): Promise<FeatureSummary> {
  return request<FeatureSummary>(`/api/workspaces/${workspaceId}/features`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function syncWorkspace(workspaceId: string): Promise<WorkspaceDetail> {
  return request<WorkspaceDetail>(`/api/workspaces/${workspaceId}/sync`, { method: "POST" });
}

export async function searchFeaturesPage(workspaceId: string, params?: URLSearchParams): Promise<PagedFeatures> {
  const qs = params?.toString() ? `?${params.toString()}` : "";
  const result = await request<FeatureSummary[] | PagedFeatures>(`/api/workspaces/${workspaceId}/features${qs}`);
  return normalizePagedFeatures(result);
}

export async function getFeature(workspaceId: string, featureId: string): Promise<FeatureDetail> {
  return request<FeatureDetail>(`/api/workspaces/${workspaceId}/features/${featureId}`);
}

export async function searchWorkspaceTasks(workspaceId: string, params?: URLSearchParams): Promise<TaskSummary[]> {
  const qs = params?.toString() ? `?${params.toString()}` : "";
  const result = await request<TaskSummary[] | PagedTasks>(`/api/workspaces/${workspaceId}/tasks${qs}`);
  return unwrapItems(result);
}

export async function getFeatureTaskList(workspaceId: string, params?: URLSearchParams): Promise<FeatureTaskPage> {
  const sp = new URLSearchParams(params);
  if (!sp.has("include")) sp.set("include", "tasks");
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  return request<FeatureTaskPage>(`/api/workspaces/${workspaceId}/features${qs}`);
}

export async function listActivity(workspaceId: string, params?: { audience?: string; limit?: number }): Promise<ActivityEvent[]> {
  const sp = new URLSearchParams();
  if (params?.audience) sp.set("audience", params.audience);
  if (params?.limit !== undefined) sp.set("limit", String(params.limit));
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  return request<ActivityEvent[]>(`/api/workspaces/${workspaceId}/activity${qs}`);
}

function unwrapItems<T>(result: T[] | { items: T[] }): T[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === "object" && Array.isArray(result.items)) {
    return result.items;
  }
  throw new Error("Expected API response data to be an array or a paged { items } object");
}

function normalizePagedFeatures(result: FeatureSummary[] | PagedFeatures): PagedFeatures {
  if (Array.isArray(result)) {
    return { items: result, total: result.length, page: 1, limit: result.length };
  }
  const items = Array.isArray(result.items) ? result.items : [];
  return {
    items,
    total: typeof result.total === "number" ? result.total : items.length,
    page: typeof result.page === "number" ? result.page : 1,
    limit: typeof result.limit === "number" ? result.limit : items.length,
  };
}
