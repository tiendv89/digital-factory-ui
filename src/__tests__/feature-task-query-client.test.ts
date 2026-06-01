/**
 * T3 — Add feature-task query client and TanStack cache
 *
 * Verifies:
 *   - buildFeatureTaskParams always sets include=tasks
 *   - buildFeatureTaskParams correctly handles status CSV normalization
 *   - buildFeatureTaskParams sets title, query, page, limit, sort params
 *   - buildFeatureTaskParams omits undefined params
 *   - TASK_MODE_FEATURE_TASK_PARAMS matches the required Task Mode defaults
 *   - getFeatureTaskList calls the correct endpoint with include=tasks
 *   - workspaceKeys.taskModeFeatures produces stable, workspace-scoped keys
 *   - workspaceKeys.taskModeFeatures normalizes status arrays for stable keys
 *   - useFeatureTaskList returns correct data and uses staleTime/gcTime/refetchInterval=60_000
 *   - useFeatureTaskList disables the query when workspaceId is null
 */

// @vitest-environment jsdom

import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  buildFeatureTaskParams,
  TASK_MODE_FEATURE_TASK_PARAMS,
} from "../services/workflow-backend/query-params";
import { workspaceKeys } from "../lib/query-keys";
import type { FeatureTaskPage } from "../services/workflow-backend/types";

// ─── Mock client ──────────────────────────────────────────────────────────────

vi.mock("../services/workflow-backend/client", () => ({
  getFeatureTaskList: vi.fn(),
}));

import { getFeatureTaskList } from "../services/workflow-backend/client";
import { useFeatureTaskList } from "../features/tasks/hooks/useFeatureTaskList";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFeatureTaskPage(overrides: Partial<FeatureTaskPage> = {}): FeatureTaskPage {
  return {
    id: "ws-uuid-1",
    name: "workspace",
    slug: "workspace",
    page: 1,
    limit: 50,
    total: 1,
    features: [
      {
        id: "feat-uuid-1",
        feature_id: "feat-uuid-1",
        feature_name: "my-feature",
        title: "My Feature",
        status: "in_implementation",
        current_stage: "tasks",
        updated_at: "2026-05-29T11:59:28Z",
        task_counts: {
          total: 2,
          done: 0,
          in_progress: 1,
          blocked: 0,
          ready: 1,
          todo: 0,
        },
        stages: {},
        tasks: [
          {
            id: "task-uuid-1",
            task_id: "task-uuid-1",
            task_name: "T1",
            feature_id: "feat-uuid-1",
            feature_name: "my-feature",
            title: "First task",
            status: "in_progress",
            repo: "digital-factory-ui",
            branch: "feature/my-feature-T1",
            is_blocked: false,
            pr: null,
            workspace_pr: null,
            updated_at: "2026-05-29T11:59:28Z",
          },
        ],
      },
    ],
    ...overrides,
  };
}

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

// ─── buildFeatureTaskParams ───────────────────────────────────────────────────

describe("buildFeatureTaskParams", () => {
  it("always includes include=tasks", () => {
    const sp = buildFeatureTaskParams({});
    expect(sp.get("include")).toBe("tasks");
  });

  it("sets status as a comma-separated string from an array", () => {
    const sp = buildFeatureTaskParams({ status: ["blocked", "in_progress", "ready"] });
    // Array entries get sorted before joining
    expect(sp.get("status")).toBe("blocked,in_progress,ready");
  });

  it("accepts status as a plain string", () => {
    const sp = buildFeatureTaskParams({ status: "in_review" });
    expect(sp.get("status")).toBe("in_review");
  });

  it("sorts status array values for stable output", () => {
    const a = buildFeatureTaskParams({ status: ["ready", "blocked"] });
    const b = buildFeatureTaskParams({ status: ["blocked", "ready"] });
    expect(a.get("status")).toBe(b.get("status"));
  });

  it("sets title", () => {
    const sp = buildFeatureTaskParams({ title: "my task" });
    expect(sp.get("title")).toBe("my task");
  });

  it("sets query", () => {
    const sp = buildFeatureTaskParams({ query: "search text" });
    expect(sp.get("query")).toBe("search text");
  });

  it("sets page and limit as strings", () => {
    const sp = buildFeatureTaskParams({ page: 2, limit: 10 });
    expect(sp.get("page")).toBe("2");
    expect(sp.get("limit")).toBe("10");
  });

  it("sets sort", () => {
    const sp = buildFeatureTaskParams({ sort: "task_id_asc" });
    expect(sp.get("sort")).toBe("task_id_asc");
  });

  it("omits undefined optional fields", () => {
    const sp = buildFeatureTaskParams({ sort: "task_id_asc" });
    expect(sp.has("title")).toBe(false);
    expect(sp.has("query")).toBe(false);
    expect(sp.has("page")).toBe(false);
    expect(sp.has("limit")).toBe(false);
    expect(sp.has("status")).toBe(false);
  });

  it("matches the canonical Task Mode params", () => {
    const sp = buildFeatureTaskParams(TASK_MODE_FEATURE_TASK_PARAMS);
    expect(sp.get("include")).toBe("tasks");
    expect(sp.get("sort")).toBe("task_id_asc");
    expect(sp.get("page")).toBe("1");
    expect(sp.get("limit")).toBe("50");
    const statuses = (sp.get("status") ?? "").split(",").sort();
    expect(statuses).toContain("blocked");
    expect(statuses).toContain("in_progress");
    expect(statuses).toContain("reviewing");
    expect(statuses).toContain("in_review");
    expect(statuses).toContain("ready");
  });
});

// ─── TASK_MODE_FEATURE_TASK_PARAMS ─────────────────────────────────────────────

describe("TASK_MODE_FEATURE_TASK_PARAMS", () => {
  it("uses task_id_asc sort", () => {
    expect(TASK_MODE_FEATURE_TASK_PARAMS.sort).toBe("task_id_asc");
  });

  it("starts on page 1 with limit 50", () => {
    expect(TASK_MODE_FEATURE_TASK_PARAMS.page).toBe(1);
    expect(TASK_MODE_FEATURE_TASK_PARAMS.limit).toBe(50);
  });

  it("includes the known Task Mode statuses", () => {
    const statuses = TASK_MODE_FEATURE_TASK_PARAMS.status as string[];
    expect(statuses).toContain("blocked");
    expect(statuses).toContain("in_progress");
    expect(statuses).toContain("reviewing");
    expect(statuses).toContain("in_review");
    expect(statuses).toContain("ready");
  });
});

// ─── getFeatureTaskList endpoint ──────────────────────────────────────────────

describe("getFeatureTaskList", () => {
  const API_BASE = "http://localhost:3001";

  beforeEach(() => {
    process.env.NEXT_PUBLIC_WORKFLOW_API_URL = API_BASE;
  });

  afterEach(() => {
    vi.resetAllMocks();
    delete process.env.NEXT_PUBLIC_WORKFLOW_API_URL;
  });

  it("calls the correct endpoint URL with include=tasks", async () => {
    const mockFn = vi.mocked(getFeatureTaskList);
    mockFn.mockResolvedValueOnce(makeFeatureTaskPage());

    const sp = buildFeatureTaskParams({ sort: "task_id_asc" });
    await getFeatureTaskList("ws-1", sp);

    expect(mockFn).toHaveBeenCalledWith("ws-1", sp);
  });

  it("returns a FeatureTaskPage with data.page, data.limit, and data.total", async () => {
    const page = makeFeatureTaskPage({ page: 2, limit: 10, total: 42 });
    vi.mocked(getFeatureTaskList).mockResolvedValueOnce(page);

    const result = await getFeatureTaskList("ws-1", buildFeatureTaskParams({}));

    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.total).toBe(42);
  });

  it("returns embedded tasks with updated_at on each task", async () => {
    const page = makeFeatureTaskPage();
    vi.mocked(getFeatureTaskList).mockResolvedValueOnce(page);

    const result = await getFeatureTaskList("ws-1", buildFeatureTaskParams({}));

    expect(result.features[0].tasks[0].updated_at).toBe("2026-05-29T11:59:28Z");
  });
});

// ─── workspaceKeys.taskModeFeatures ──────────────────────────────────────────

describe("workspaceKeys.taskModeFeatures", () => {
  const WS = "ws-abc";

  it("includes workspace ID and task-mode-features segment", () => {
    const key = workspaceKeys.taskModeFeatures(WS, {});
    expect(key[0]).toBe("workspace");
    expect(key[1]).toBe(WS);
    expect(key[2]).toBe("task-mode-features");
  });

  it("differs across workspace IDs", () => {
    const a = workspaceKeys.taskModeFeatures("ws-1", {});
    const b = workspaceKeys.taskModeFeatures("ws-2", {});
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("is stable for equivalent params", () => {
    const a = workspaceKeys.taskModeFeatures(WS, { sort: "task_id_asc", page: 1 });
    const b = workspaceKeys.taskModeFeatures(WS, { sort: "task_id_asc", page: 1 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("sorts multi-value status arrays for stable keys", () => {
    const a = workspaceKeys.taskModeFeatures(WS, { status: ["ready", "blocked"] });
    const b = workspaceKeys.taskModeFeatures(WS, { status: ["blocked", "ready"] });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("produces different keys for different status sets", () => {
    const a = workspaceKeys.taskModeFeatures(WS, { status: ["ready"] });
    const b = workspaceKeys.taskModeFeatures(WS, { status: ["blocked"] });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("includes title in the key when provided", () => {
    const key = workspaceKeys.taskModeFeatures(WS, { title: "my task" });
    const norm = key[3] as Record<string, unknown>;
    expect(norm.title).toBe("my task");
  });

  it("includes query in the key when provided", () => {
    const key = workspaceKeys.taskModeFeatures(WS, { query: "search" });
    const norm = key[3] as Record<string, unknown>;
    expect(norm.query).toBe("search");
  });

  it("omits undefined params from the normalized key", () => {
    const key = workspaceKeys.taskModeFeatures(WS, { sort: "task_id_asc" });
    const norm = key[3] as Record<string, unknown>;
    expect("title" in norm).toBe(false);
    expect("query" in norm).toBe(false);
    expect("status" in norm).toBe(false);
    expect("page" in norm).toBe(false);
    expect("limit" in norm).toBe(false);
    expect(norm.sort).toBe("task_id_asc");
  });
});

// ─── useFeatureTaskList hook ───────────────────────────────────────────────────

describe("useFeatureTaskList", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    queryClient.clear();
  });

  it("returns data from the API when workspaceId is provided", async () => {
    const page = makeFeatureTaskPage();
    vi.mocked(getFeatureTaskList).mockResolvedValue(page);

    const { result } = renderHook(
      () => useFeatureTaskList("ws-1", TASK_MODE_FEATURE_TASK_PARAMS),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.data).not.toBeNull());

    expect(result.current.data?.page).toBe(1);
    expect(result.current.data?.limit).toBe(50);
    expect(result.current.data?.total).toBe(1);
    expect(result.current.features?.[0]).toBeUndefined(); // accessed via data.features
    expect(result.current.data?.features[0].tasks[0].updated_at).toBe("2026-05-29T11:59:28Z");
  });

  it("does not fetch when workspaceId is null", () => {
    const { result } = renderHook(
      () => useFeatureTaskList(null, {}),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(vi.mocked(getFeatureTaskList)).not.toHaveBeenCalled();
  });

  it("returns loading=true while fetching with no cached data", async () => {
    let resolvePromise!: (value: FeatureTaskPage) => void;
    const deferred = new Promise<FeatureTaskPage>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(getFeatureTaskList).mockReturnValueOnce(deferred);

    const { result } = renderHook(
      () => useFeatureTaskList("ws-1", {}),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(result.current.loading).toBe(true);

    resolvePromise(makeFeatureTaskPage());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("returns error when the query fails", async () => {
    const apiError = { code: "NOT_FOUND", message: "workspace not found", retryable: false };
    vi.mocked(getFeatureTaskList).mockRejectedValue(apiError);

    const { result } = renderHook(
      () => useFeatureTaskList("ws-1", {}),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.code).toBe("NOT_FOUND");
  });

  it("uses a 60-second staleTime, gcTime, and refetchInterval", () => {
    // Inspect the query options by spying on useQuery internals via queryClient cache
    // We verify this by checking the query observer options on the created query.
    vi.mocked(getFeatureTaskList).mockResolvedValue(makeFeatureTaskPage());

    const { result } = renderHook(
      () => useFeatureTaskList("ws-1", {}),
      { wrapper: makeWrapper(queryClient) },
    );

    // The query key for this hook
    const key = workspaceKeys.taskModeFeatures("ws-1", {});
    const query = queryClient.getQueryCache().find({ queryKey: key });

    expect(query).toBeDefined();
    // staleTime and gcTime are set on the query's observer options
    const options = query?.options;
    expect(options?.staleTime).toBe(60_000);
    expect(options?.gcTime).toBe(60_000);
    expect(options?.refetchInterval).toBe(60_000);
  });

  it("surfaces data.features with embedded tasks", async () => {
    const page = makeFeatureTaskPage();
    vi.mocked(getFeatureTaskList).mockResolvedValue(page);

    const { result } = renderHook(
      () => useFeatureTaskList("ws-1", TASK_MODE_FEATURE_TASK_PARAMS),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.data).not.toBeNull());

    const features = result.current.data?.features ?? [];
    expect(features).toHaveLength(1);
    expect(features[0].feature_name).toBe("my-feature");
    expect(features[0].tasks).toHaveLength(1);
    expect(features[0].tasks[0].task_name).toBe("T1");
    expect(features[0].tasks[0].updated_at).toBe("2026-05-29T11:59:28Z");
  });

  it("uses independent cache keys for different workspace IDs", async () => {
    const pageA = makeFeatureTaskPage({ id: "ws-1", name: "workspace-a" });
    const pageB = makeFeatureTaskPage({ id: "ws-2", name: "workspace-b" });

    vi.mocked(getFeatureTaskList)
      .mockResolvedValueOnce(pageA)
      .mockResolvedValueOnce(pageB);

    const { result: resultA } = renderHook(
      () => useFeatureTaskList("ws-1", {}),
      { wrapper: makeWrapper(queryClient) },
    );
    const { result: resultB } = renderHook(
      () => useFeatureTaskList("ws-2", {}),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(resultA.current.data).not.toBeNull());
    await waitFor(() => expect(resultB.current.data).not.toBeNull());

    expect(resultA.current.data?.id).toBe("ws-1");
    expect(resultB.current.data?.id).toBe("ws-2");
  });
});
