import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  request,
  importWorkspace,
  getWorkspace,
  syncWorkspace,
  searchFeatures,
  getFeature,
  searchWorkspaceTasks,
  getWorkspaceTask,
  searchFeatureTasks,
  getFeatureTask,
} from "../services/workflow-backend/client";
import type { ApiError } from "../services/workflow-backend/types";

const API_BASE = "http://localhost:3001";

function makeResponse(status: number, body: unknown): Response {
  const text = JSON.stringify(body);
  return {
    status,
    ok: status >= 200 && status < 300,
    text: () => Promise.resolve(text),
  } as unknown as Response;
}

function successResponse(data: unknown): Response {
  return makeResponse(200, { success: true, data });
}

function errorResponse(status: number, error: Partial<ApiError>): Response {
  return makeResponse(status, {
    success: false,
    error: { code: "SOME_ERROR", message: "error", retryable: false, ...error },
  });
}

describe("workflow-backend client", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.NEXT_PUBLIC_API_BASE_URL = API_BASE;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  describe("request", () => {
    it("returns data from a successful { success, data } envelope", async () => {
      const data = { id: "ws-uuid", name: "My Workspace" };
      fetchMock.mockResolvedValueOnce(successResponse(data));
      const result = await request<typeof data>("/api/workspaces/ws-uuid");
      expect(result).toEqual(data);
    });

    it("sends Accept: application/json header on GET", async () => {
      fetchMock.mockResolvedValueOnce(successResponse({}));
      await request("/api/workspaces/ws-uuid");
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Accept"]).toBe("application/json");
    });

    it("sends Content-Type header when body is present", async () => {
      fetchMock.mockResolvedValueOnce(successResponse({}));
      await request("/api/workspaces/import", {
        method: "POST",
        body: JSON.stringify({ repo_url: "https://github.com/org/repo" }),
      });
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("does not send Content-Type header when body is absent", async () => {
      fetchMock.mockResolvedValueOnce(successResponse({}));
      await request("/api/workspaces/ws-uuid");
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBeUndefined();
    });

    it("throws ApiError from { success: false } body on 200", async () => {
      const error: ApiError = {
        code: "DATABASE_NOT_FOUND",
        message: "workspace not found",
        retryable: false,
      };
      fetchMock.mockResolvedValueOnce(makeResponse(200, { success: false, error }));
      await expect(request("/api/workspaces/missing")).rejects.toMatchObject({
        code: "DATABASE_NOT_FOUND",
        message: "workspace not found",
        retryable: false,
      });
    });

    it("throws ApiError from a 404 error response", async () => {
      fetchMock.mockResolvedValueOnce(
        errorResponse(404, { code: "DATABASE_NOT_FOUND", message: "not found", retryable: false }),
      );
      await expect(request("/api/workspaces/missing")).rejects.toMatchObject({
        code: "DATABASE_NOT_FOUND",
        retryable: false,
      });
    });

    it("throws UNKNOWN_ERROR when non-2xx has no error body", async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(500, null));
      await expect(request("/api/workspaces/ws-uuid")).rejects.toMatchObject({
        code: "UNKNOWN_ERROR",
        retryable: false,
      });
    });

    it("throws UNKNOWN_ERROR when response text is empty and status is non-2xx", async () => {
      fetchMock.mockResolvedValueOnce({
        status: 500,
        ok: false,
        text: () => Promise.resolve(""),
      } as unknown as Response);
      await expect(request("/api/workspaces/ws-uuid")).rejects.toMatchObject({
        code: "UNKNOWN_ERROR",
      });
    });

    it("preserves path and cached_data from ApiError", async () => {
      const error: ApiError = {
        code: "ADAPTER_TIMEOUT",
        message: "timeout",
        retryable: true,
        path: "/internal/workspaces/ws-uuid/sync",
        cached_data: { stale: true },
      };
      fetchMock.mockResolvedValueOnce(makeResponse(504, { success: false, error }));
      await expect(request("/api/workspaces/ws-uuid/sync", { method: "POST" })).rejects.toMatchObject({
        code: "ADAPTER_TIMEOUT",
        retryable: true,
        path: "/internal/workspaces/ws-uuid/sync",
        cached_data: { stale: true },
      });
    });

    it("throws when NEXT_PUBLIC_API_BASE_URL is not set", async () => {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
      await expect(request("/api/workspaces/ws-uuid")).rejects.toThrow(
        "NEXT_PUBLIC_API_BASE_URL is required",
      );
    });

    it("prepends API_BASE to the path", async () => {
      fetchMock.mockResolvedValueOnce(successResponse({}));
      await request("/api/workspaces/ws-uuid");
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe(`${API_BASE}/api/workspaces/ws-uuid`);
    });
  });

  describe("importWorkspace", () => {
    it("POSTs to /api/workspaces/import with body", async () => {
      const detail = { id: "ws-uuid", name: "Test", features: [], tasks: [] };
      fetchMock.mockResolvedValueOnce(successResponse(detail));

      const result = await importWorkspace({ repo_url: "https://github.com/org/repo", name: "Test" });

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API_BASE}/api/workspaces/import`);
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({
        repo_url: "https://github.com/org/repo",
        name: "Test",
      });
      expect(result.id).toBe("ws-uuid");
    });

    it("includes default_branch when provided", async () => {
      fetchMock.mockResolvedValueOnce(successResponse({}));
      await importWorkspace({ repo_url: "https://github.com/org/repo", default_branch: "develop" });
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(init.body as string);
      expect(body.default_branch).toBe("develop");
    });
  });

  describe("getWorkspace", () => {
    it("GETs /api/workspaces/:workspaceId", async () => {
      const detail = { id: "ws-1", name: "Workspace", features: [], tasks: [] };
      fetchMock.mockResolvedValueOnce(successResponse(detail));
      const result = await getWorkspace("ws-1");
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe(`${API_BASE}/api/workspaces/ws-1`);
      expect(result.id).toBe("ws-1");
    });
  });

  describe("syncWorkspace", () => {
    it("POSTs to /api/workspaces/:workspaceId/sync with no body", async () => {
      const detail = { id: "ws-1", name: "Workspace", features: [], tasks: [] };
      fetchMock.mockResolvedValueOnce(successResponse(detail));
      await syncWorkspace("ws-1");
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API_BASE}/api/workspaces/ws-1/sync`);
      expect(init.method).toBe("POST");
    });
  });

  describe("searchFeatures", () => {
    it("GETs /api/workspaces/:workspaceId/features without params", async () => {
      fetchMock.mockResolvedValueOnce(successResponse([]));
      await searchFeatures("ws-1");
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe(`${API_BASE}/api/workspaces/ws-1/features`);
    });

    it("appends query string when params provided", async () => {
      fetchMock.mockResolvedValueOnce(successResponse([]));
      const params = new URLSearchParams({ title: "data", status: "ready", sort: "title_asc" });
      await searchFeatures("ws-1", params);
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain("title=data");
      expect(url).toContain("status=ready");
      expect(url).toContain("sort=title_asc");
    });
  });

  describe("getFeature", () => {
    it("GETs /api/workspaces/:workspaceId/features/:featureId", async () => {
      fetchMock.mockResolvedValueOnce(successResponse({}));
      await getFeature("ws-1", "feat-1");
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe(`${API_BASE}/api/workspaces/ws-1/features/feat-1`);
    });
  });

  describe("searchWorkspaceTasks", () => {
    it("GETs /api/workspaces/:workspaceId/tasks without params", async () => {
      fetchMock.mockResolvedValueOnce(successResponse([]));
      await searchWorkspaceTasks("ws-1");
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe(`${API_BASE}/api/workspaces/ws-1/tasks`);
    });

    it("appends query string when params provided", async () => {
      fetchMock.mockResolvedValueOnce(successResponse([]));
      const params = new URLSearchParams({ status: "in_progress,ready", sort: "task_id_asc" });
      await searchWorkspaceTasks("ws-1", params);
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain("status=in_progress%2Cready");
    });
  });

  describe("getWorkspaceTask", () => {
    it("GETs /api/workspaces/:workspaceId/tasks/:taskId", async () => {
      fetchMock.mockResolvedValueOnce(successResponse({}));
      await getWorkspaceTask("ws-1", "task-1");
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe(`${API_BASE}/api/workspaces/ws-1/tasks/task-1`);
    });
  });

  describe("searchFeatureTasks", () => {
    it("GETs /api/workspaces/:workspaceId/features/:featureId/tasks without params", async () => {
      fetchMock.mockResolvedValueOnce(successResponse([]));
      await searchFeatureTasks("ws-1", "feat-1");
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe(`${API_BASE}/api/workspaces/ws-1/features/feat-1/tasks`);
    });

    it("appends query string when params provided", async () => {
      fetchMock.mockResolvedValueOnce(successResponse([]));
      const params = new URLSearchParams({ status: "ready", sort: "task_id_asc" });
      await searchFeatureTasks("ws-1", "feat-1", params);
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain("status=ready");
    });
  });

  describe("getFeatureTask", () => {
    it("GETs /api/workspaces/:workspaceId/features/:featureId/tasks/:taskId", async () => {
      fetchMock.mockResolvedValueOnce(successResponse({}));
      await getFeatureTask("ws-1", "feat-1", "task-1");
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe(`${API_BASE}/api/workspaces/ws-1/features/feat-1/tasks/task-1`);
    });
  });
});
