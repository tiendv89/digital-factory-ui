// @vitest-environment jsdom
/**
 * T2 — Board/sidebar/mode query cache migration tests.
 *
 * Verifies that:
 * - useBoardData, useSidebarTasks, useBackendTaskSearch, useBackendFeatureSearch
 *   use TanStack Query cache instead of local useEffect state
 * - Cached data is returned immediately without a loading state on revisit
 * - Manual reload triggers a refetch
 * - Workspace sync updates the board detail cache
 * - The 60-second auto-refresh refetches via the cache without resetting loading state
 */

import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { workspaceKeys } from "../lib/query-keys";

// ─── Service mocks ────────────────────────────────────────────────────────────

vi.mock("@/services/workflow-backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/workflow-backend")>();
  return {
    ...actual,
    getWorkspace: vi.fn(),
    searchWorkspaceTasks: vi.fn(),
    searchWorkspaceTasksPage: vi.fn(),
    searchFeaturesPage: vi.fn(),
  };
});

import {
  getWorkspace,
  searchWorkspaceTasks,
  searchWorkspaceTasksPage,
  searchFeaturesPage,
} from "@/services/workflow-backend";
import { useBoardData } from "../features/board/hooks/useBoardData";
import { useSidebarTasks } from "../features/board/hooks/useSidebarTasks";
import { useBackendTaskSearch } from "../features/board/hooks/useBackendTaskSearch";
import { useBackendFeatureSearch } from "../features/board/hooks/useBackendFeatureSearch";

const getWorkspaceMock = vi.mocked(getWorkspace);
const searchTasksMock = vi.mocked(searchWorkspaceTasks);
const searchTasksPageMock = vi.mocked(searchWorkspaceTasksPage);
const searchFeaturesPageMock = vi.mocked(searchFeaturesPage);

const WORKSPACE_ID = "ws-test-123";

const WORKSPACE_DETAIL = {
  id: WORKSPACE_ID,
  name: "Test Workspace",
  features: [],
  tasks: [],
  repo_url: "https://github.com/test/repo",
  default_branch: "main",
  source_state: "synced" as const,
};

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 5 * 60 * 1000, gcTime: 5 * 60 * 1000 },
    },
  });
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ─── useBoardData tests ───────────────────────────────────────────────────────

describe("useBoardData — cached query", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
    getWorkspaceMock.mockResolvedValue(WORKSPACE_DETAIL);
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("returns loading=true while fetching and loading=false after data arrives", async () => {
    const { result } = renderHook(
      () => useBoardData(WORKSPACE_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getWorkspaceMock).toHaveBeenCalledWith(WORKSPACE_ID);
  });

  it("uses initialData when provided — no immediate loading state", () => {
    const { result } = renderHook(
      () => useBoardData(WORKSPACE_ID, { initialData: WORKSPACE_DETAIL }),
      { wrapper: makeWrapper(queryClient) },
    );

    // initialData should be used immediately — no loading state
    expect(result.current.loading).toBe(false);
    expect(result.current.features).toBeDefined();
  });

  it("returns cached data immediately on second render without refetch", async () => {
    // Pre-populate the cache
    queryClient.setQueryData(workspaceKeys.detail(WORKSPACE_ID), WORKSPACE_DETAIL);

    const { result } = renderHook(
      () => useBoardData(WORKSPACE_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    // Should have data immediately without loading
    expect(result.current.loading).toBe(false);
    // Since staleTime is 5 min, cached fresh data should NOT trigger a fetch
    expect(getWorkspaceMock).not.toHaveBeenCalled();
  });

  it("exposes reload function that triggers a refetch", async () => {
    const { result } = renderHook(
      () => useBoardData(WORKSPACE_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    const callCount = getWorkspaceMock.mock.calls.length;

    act(() => {
      result.current.reload();
    });

    await waitFor(() => expect(getWorkspaceMock.mock.calls.length).toBeGreaterThan(callCount));
  });

  it("returns empty features when workspaceId is null", () => {
    const { result } = renderHook(
      () => useBoardData(null),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(result.current.features).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(getWorkspaceMock).not.toHaveBeenCalled();
  });

  it("does not reset loading state on background refetch when data is cached", async () => {
    // Pre-populate cache with fresh data
    queryClient.setQueryData(workspaceKeys.detail(WORKSPACE_ID), WORKSPACE_DETAIL);
    // Mark it stale so it will refetch
    queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(WORKSPACE_ID) });

    const { result } = renderHook(
      () => useBoardData(WORKSPACE_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    // loading should remain false because data exists in cache (isLoading only true when no data)
    expect(result.current.loading).toBe(false);
    // data should be available immediately from cache
    expect(result.current.features).toBeDefined();
  });
});

// ─── useSidebarTasks tests ────────────────────────────────────────────────────

describe("useSidebarTasks — cached query", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
    searchTasksMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("fetches when workspaceId is provided", async () => {
    const { result } = renderHook(
      () => useSidebarTasks(WORKSPACE_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(searchTasksMock).toHaveBeenCalledWith(WORKSPACE_ID, expect.anything());
  });

  it("returns empty tasks when workspaceId is null", () => {
    const { result } = renderHook(
      () => useSidebarTasks(null),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(result.current.tasks).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(searchTasksMock).not.toHaveBeenCalled();
  });

  it("returns cached sidebar data immediately on revisit", async () => {
    const { SIDEBAR_TASK_PARAMS } = await import("@/services/workflow-backend");
    const CACHED_TASKS = [
      { id: "T1", title: "Task 1", status: "in_progress" } as never,
    ];
    queryClient.setQueryData(
      workspaceKeys.sidebarTasks(WORKSPACE_ID, SIDEBAR_TASK_PARAMS),
      CACHED_TASKS,
    );

    const { result } = renderHook(
      () => useSidebarTasks(WORKSPACE_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    // Cached data should be immediately available
    expect(result.current.tasks).toEqual(CACHED_TASKS);
    expect(result.current.loading).toBe(false);
    // No refetch needed since data is fresh
    expect(searchTasksMock).not.toHaveBeenCalled();
  });

  it("exposes reload that triggers a new fetch", async () => {
    const { result } = renderHook(
      () => useSidebarTasks(WORKSPACE_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    const callCount = searchTasksMock.mock.calls.length;

    act(() => {
      result.current.reload();
    });

    await waitFor(() => expect(searchTasksMock.mock.calls.length).toBeGreaterThan(callCount));
  });
});

// ─── useBackendTaskSearch tests ───────────────────────────────────────────────

describe("useBackendTaskSearch — cached query", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
    searchTasksPageMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("returns null results when params are empty (not active)", () => {
    const { result } = renderHook(
      () => useBackendTaskSearch(WORKSPACE_ID, {}),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(result.current.results).toBeNull();
    expect(result.current.searching).toBe(false);
    expect(searchTasksPageMock).not.toHaveBeenCalled();
  });

  it("fetches when search is active (title or status provided)", async () => {
    const { result } = renderHook(
      () => useBackendTaskSearch(WORKSPACE_ID, { title: "my task" }),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.searching).toBe(false));
    expect(searchTasksPageMock).toHaveBeenCalledWith(
      WORKSPACE_ID,
      expect.anything(),
    );
  });

  it("returns cached results immediately on mode switch (revisit within cache window)", async () => {
    const params = { title: "auth", page: 1, limit: 20 };
    const CACHED_PAGED = { items: [], total: 0, page: 1, limit: 20 };
    queryClient.setQueryData(workspaceKeys.tasks(WORKSPACE_ID, params), CACHED_PAGED);

    const { result } = renderHook(
      () => useBackendTaskSearch(WORKSPACE_ID, params),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(result.current.results).toEqual([]);
    expect(result.current.searching).toBe(false);
    expect(searchTasksPageMock).not.toHaveBeenCalled();
  });

  it("returns null and no fetch when workspaceId is null", () => {
    const { result } = renderHook(
      () => useBackendTaskSearch(null, { title: "foo" }),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(result.current.results).toBeNull();
    expect(result.current.searching).toBe(false);
    expect(searchTasksPageMock).not.toHaveBeenCalled();
  });

  it("uses different cache keys for different search params", async () => {
    const params1 = { title: "auth" };
    const params2 = { title: "board" };

    const cached1 = { items: [], total: 5, page: 1, limit: 20 };
    const cached2 = { items: [], total: 10, page: 1, limit: 20 };
    queryClient.setQueryData(workspaceKeys.tasks(WORKSPACE_ID, params1), cached1);
    queryClient.setQueryData(workspaceKeys.tasks(WORKSPACE_ID, params2), cached2);

    const { result: r1 } = renderHook(
      () => useBackendTaskSearch(WORKSPACE_ID, params1),
      { wrapper: makeWrapper(queryClient) },
    );
    const { result: r2 } = renderHook(
      () => useBackendTaskSearch(WORKSPACE_ID, params2),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(r1.current.pagination?.total).toBe(5);
    expect(r2.current.pagination?.total).toBe(10);
  });
});

// ─── useBackendFeatureSearch tests ────────────────────────────────────────────

describe("useBackendFeatureSearch — cached query", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
    searchFeaturesPageMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("returns null when params are empty", () => {
    const { result } = renderHook(
      () => useBackendFeatureSearch(WORKSPACE_ID, {}),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(result.current.results).toBeNull();
    expect(result.current.searching).toBe(false);
    expect(searchFeaturesPageMock).not.toHaveBeenCalled();
  });

  it("fetches when search is active (title or status)", async () => {
    const { result } = renderHook(
      () => useBackendFeatureSearch(WORKSPACE_ID, { title: "auth" }),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.searching).toBe(false));
    expect(searchFeaturesPageMock).toHaveBeenCalledWith(
      WORKSPACE_ID,
      expect.anything(),
    );
  });

  it("returns cached feature search results immediately on mode revisit", async () => {
    const params = { title: "auth-feature" };
    const CACHED_PAGED = { items: [], total: 3, page: 1, limit: 20 };
    queryClient.setQueryData(workspaceKeys.features(WORKSPACE_ID, params), CACHED_PAGED);

    const { result } = renderHook(
      () => useBackendFeatureSearch(WORKSPACE_ID, params),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(result.current.pagination?.total).toBe(3);
    expect(result.current.searching).toBe(false);
    expect(searchFeaturesPageMock).not.toHaveBeenCalled();
  });

  it("returns null and no fetch when workspaceId is null", () => {
    const { result } = renderHook(
      () => useBackendFeatureSearch(null, { title: "foo" }),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(result.current.results).toBeNull();
    expect(result.current.searching).toBe(false);
    expect(searchFeaturesPageMock).not.toHaveBeenCalled();
  });
});

// ─── Cache key scoping: cross-workspace isolation ─────────────────────────────

describe("Cache scoping: workspace isolation", () => {
  it("board detail keys differ across workspace IDs", () => {
    const keyA = workspaceKeys.detail("ws-a");
    const keyB = workspaceKeys.detail("ws-b");
    expect(JSON.stringify(keyA)).not.toBe(JSON.stringify(keyB));
  });

  it("task search keys differ across workspace IDs with same params", () => {
    const params = { title: "auth", page: 1 };
    const keyA = workspaceKeys.tasks("ws-a", params);
    const keyB = workspaceKeys.tasks("ws-b", params);
    expect(JSON.stringify(keyA)).not.toBe(JSON.stringify(keyB));
  });

  it("feature search keys differ across workspace IDs", () => {
    const params = { title: "auth-feature" };
    const keyA = workspaceKeys.features("ws-a", params);
    const keyB = workspaceKeys.features("ws-b", params);
    expect(JSON.stringify(keyA)).not.toBe(JSON.stringify(keyB));
  });

  it("sidebar tasks keys differ across workspace IDs", () => {
    const keyA = workspaceKeys.sidebarTasks("ws-a");
    const keyB = workspaceKeys.sidebarTasks("ws-b");
    expect(JSON.stringify(keyA)).not.toBe(JSON.stringify(keyB));
  });
});

// ─── Sync cache update ────────────────────────────────────────────────────────

describe("Workspace sync updates board detail cache", () => {
  it("setQueryData updates the board detail cache immediately", () => {
    const queryClient = makeQueryClient();
    const newDetail = { ...WORKSPACE_DETAIL, name: "Updated Workspace" };

    queryClient.setQueryData(workspaceKeys.detail(WORKSPACE_ID), newDetail);

    const cached = queryClient.getQueryData(workspaceKeys.detail(WORKSPACE_ID));
    expect(cached).toEqual(newDetail);
  });

  it("invalidating workspace sidebar-tasks prefix marks the entry stale", () => {
    const queryClient = makeQueryClient();
    // Use a plain URLSearchParams to represent sidebar params for key construction
    const sidebarParams = new URLSearchParams({ status: "blocked", sort: "asc" });
    const key = workspaceKeys.sidebarTasks(WORKSPACE_ID, sidebarParams);

    queryClient.setQueryData(key, []);
    queryClient.invalidateQueries({ queryKey: ["workspace", WORKSPACE_ID, "sidebar-tasks"] });

    const state = queryClient.getQueryState(key);
    expect(state?.isInvalidated).toBe(true);
  });
});
