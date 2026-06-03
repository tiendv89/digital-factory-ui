import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  searchFeaturesPage,
  searchWorkspaceTasksPage,
} from "../services/workflow-backend/client";

const API_BASE = "http://localhost:3001";

function makeResponse(body: unknown): Response {
  return {
    status: 200,
    ok: true,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function successResponse(data: unknown): Response {
  return makeResponse({ success: true, data });
}

describe("searchFeaturesPage", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.NEXT_PUBLIC_WORKFLOW_API_URL = API_BASE;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_WORKFLOW_API_URL;
  });

  it("returns full PagedFeatures from the backend", async () => {
    const feature = { id: "feat-1", feature_name: "dashboard" };
    const paged = { items: [feature], total: 10, page: 2, limit: 5 };
    fetchMock.mockResolvedValueOnce(successResponse(paged));

    const result = await searchFeaturesPage("ws-1");

    expect(result).toEqual(paged);
    expect(result.items).toEqual([feature]);
    expect(result.total).toBe(10);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(5);
  });

  it("normalizes a bare array response into PagedFeatures", async () => {
    const feature = { id: "feat-1", feature_name: "api" };
    fetchMock.mockResolvedValueOnce(successResponse([feature]));

    const result = await searchFeaturesPage("ws-1");

    expect(result.items).toEqual([feature]);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(1);
  });

  it("appends query string when params provided", async () => {
    fetchMock.mockResolvedValueOnce(
      successResponse({ items: [], total: 0, page: 1, limit: 20 }),
    );
    const params = new URLSearchParams({ page: "3", limit: "50" });
    await searchFeaturesPage("ws-1", params);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("page=3");
    expect(url).toContain("limit=50");
  });

  it("GETs /api/workspaces/:workspaceId/features", async () => {
    fetchMock.mockResolvedValueOnce(successResponse({ items: [], total: 0, page: 1, limit: 20 }));
    await searchFeaturesPage("ws-1");
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(`${API_BASE}/api/workspaces/ws-1/features`);
  });
});

describe("searchWorkspaceTasksPage", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.NEXT_PUBLIC_WORKFLOW_API_URL = API_BASE;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_WORKFLOW_API_URL;
  });

  it("returns full PagedTasks from the backend", async () => {
    const task = { id: "task-1", task_name: "T1" };
    const paged = { items: [task], total: 50, page: 1, limit: 100 };
    fetchMock.mockResolvedValueOnce(successResponse(paged));

    const result = await searchWorkspaceTasksPage("ws-1");

    expect(result).toEqual(paged);
    expect(result.items).toEqual([task]);
    expect(result.total).toBe(50);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
  });

  it("normalizes a bare array response into PagedTasks", async () => {
    const task = { id: "task-1", task_name: "T1" };
    fetchMock.mockResolvedValueOnce(successResponse([task]));

    const result = await searchWorkspaceTasksPage("ws-1");

    expect(result.items).toEqual([task]);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(1);
  });

  it("GETs /api/workspaces/:workspaceId/tasks", async () => {
    fetchMock.mockResolvedValueOnce(successResponse({ items: [], total: 0, page: 1, limit: 20 }));
    await searchWorkspaceTasksPage("ws-1");
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(`${API_BASE}/api/workspaces/ws-1/tasks`);
  });

  it("appends query string when params provided", async () => {
    fetchMock.mockResolvedValueOnce(
      successResponse({ items: [], total: 0, page: 1, limit: 50 }),
    );
    const params = new URLSearchParams({ status: "in_progress,ready", sort: "task_id_asc" });
    await searchWorkspaceTasksPage("ws-1", params);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("status=in_progress%2Cready");
  });
});
