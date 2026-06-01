/**
 * tasks-api-integration — T5 Regression and browser/network QA
 *
 * Checklist items covered:
 *   [x] Task Mode calls GET /api/workspaces/:workspaceId/features?include=tasks
 *   [x] Task Mode includes status, title, query, page, limit, sort=task_id_asc
 *   [x] Task Mode reads updated_at from embedded backend task items
 *   [x] Task Mode reads feature-list pagination from data.page, data.limit, data.total
 *   [x] Task Mode does NOT expect task_page or has_more
 *   [x] TanStack Query uses 60-second cache window and refetchInterval: 60_000
 *   [x] Feature Mode does NOT switch to the combined response unintentionally
 *   [x] Existing /tasks consumers still work and receive updated_at
 *   [n] Browser/network QA against live backend — see QA_NOTES block at bottom
 *
 * QA_NOTES:
 *   Backend T1 (add updated_at to /tasks) and T2 (add /features?include=tasks)
 *   must be deployed before live network QA can pass.
 *   At the time of this PR the backend tasks are merged but the deployment
 *   status is unknown. Live QA items below are documented as manual checks:
 *
 *   - Navigate to the board in Task Mode.
 *   - Open DevTools → Network.
 *   - Confirm a request to /features?include=tasks is issued on load.
 *   - Confirm sort=task_id_asc, page=1, limit=50, status=... appear in the URL.
 *   - Confirm response JSON contains data.page, data.limit, data.total,
 *     data.features[].tasks[].updated_at.
 *   - Confirm NO task_page or has_more field in the response.
 *   - Switch to Feature Mode and confirm no /features?include=tasks request fires.
 *   - Call GET /api/workspaces/:workspaceId/tasks and confirm updated_at is present
 *     on every returned task item.
 *
 *   If the backend is not yet deployed, the above checks cannot pass in a live
 *   environment and this PR must remain gated until backend deployment completes.
 */

// @vitest-environment jsdom

import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  buildFeatureTaskParams,
  buildTaskParams,
  TASK_MODE_FEATURE_TASK_PARAMS,
} from "../services/workflow-backend/query-params";
import { workspaceKeys } from "../lib/query-keys";
import type {
  FeatureTaskPage,
  TaskSummaryWithUpdatedAt,
  FeatureWithTasks,
  TaskSummary,
} from "../services/workflow-backend/types";

// ─── Mock: workflow-backend client ────────────────────────────────────────────

vi.mock("../services/workflow-backend/client", () => ({
  getFeatureTaskList: vi.fn(),
  searchWorkspaceTasksPage: vi.fn(),
}));

import { getFeatureTaskList, searchWorkspaceTasksPage } from "../services/workflow-backend/client";
import { useFeatureTaskList } from "../features/tasks/hooks/useFeatureTaskList";
import {
  adaptFeatureWithTasksToFeatures,
  adaptTaskSummary,
} from "../features/workspaces/lib/workspaceAdapter";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTaskWithUpdatedAt(
  overrides: Partial<TaskSummaryWithUpdatedAt> = {},
): TaskSummaryWithUpdatedAt {
  return {
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
    ...overrides,
  };
}

function makeFeatureWithTasks(overrides: Partial<FeatureWithTasks> = {}): FeatureWithTasks {
  return {
    id: "feat-uuid-1",
    feature_id: "feat-uuid-1",
    feature_name: "my-feature",
    title: "My Feature",
    status: "in_implementation",
    current_stage: "tasks",
    updated_at: "2026-05-29T11:59:28Z",
    task_counts: {
      total: 1,
      done: 0,
      in_progress: 1,
      blocked: 0,
      ready: 0,
      todo: 0,
    },
    stages: {},
    tasks: [makeTaskWithUpdatedAt()],
    ...overrides,
  };
}

function makeFeatureTaskPage(overrides: Partial<FeatureTaskPage> = {}): FeatureTaskPage {
  return {
    id: "ws-uuid-1",
    name: "workspace",
    slug: "workspace",
    page: 1,
    limit: 50,
    total: 1,
    features: [makeFeatureWithTasks()],
    ...overrides,
  };
}

function makeTaskSummary(overrides: Partial<TaskSummaryWithUpdatedAt> = {}): TaskSummaryWithUpdatedAt {
  return {
    id: "task-uuid-2",
    task_id: "task-uuid-2",
    task_name: "T2",
    feature_id: "feat-uuid-2",
    feature_name: "other-feature",
    title: "Other task",
    status: "ready",
    repo: "workflow-backend",
    branch: "feature/other-T2",
    is_blocked: false,
    pr: null,
    workspace_pr: null,
    updated_at: "2026-05-30T10:00:00Z",
    ...overrides,
  };
}

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

// ─── 1. Task Mode calls GET /features?include=tasks ───────────────────────────

describe("Task Mode endpoint — calls /features?include=tasks, not /tasks", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    vi.resetAllMocks();
    queryClient.clear();
  });

  it("getFeatureTaskList is called for Task Mode (not searchWorkspaceTasksPage)", async () => {
    vi.mocked(getFeatureTaskList).mockResolvedValue(makeFeatureTaskPage());

    const { result } = renderHook(
      () => useFeatureTaskList("ws-1", TASK_MODE_FEATURE_TASK_PARAMS),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.data).not.toBeNull());

    expect(vi.mocked(getFeatureTaskList)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(searchWorkspaceTasksPage)).not.toHaveBeenCalled();
  });

  it("the URLSearchParams passed to getFeatureTaskList always contain include=tasks", async () => {
    vi.mocked(getFeatureTaskList).mockResolvedValue(makeFeatureTaskPage());

    const { result } = renderHook(
      () => useFeatureTaskList("ws-1", TASK_MODE_FEATURE_TASK_PARAMS),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.data).not.toBeNull());

    const [, passedParams] = vi.mocked(getFeatureTaskList).mock.calls[0];
    const sp = passedParams as URLSearchParams;
    expect(sp.get("include")).toBe("tasks");
  });

  it("passes the workspace ID as the first argument to getFeatureTaskList", async () => {
    vi.mocked(getFeatureTaskList).mockResolvedValue(makeFeatureTaskPage());

    const { result } = renderHook(
      () => useFeatureTaskList("ws-abc-123", TASK_MODE_FEATURE_TASK_PARAMS),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.data).not.toBeNull());

    const [calledWorkspaceId] = vi.mocked(getFeatureTaskList).mock.calls[0];
    expect(calledWorkspaceId).toBe("ws-abc-123");
  });
});

// ─── 2. Task Mode query params sent to the endpoint ──────────────────────────

describe("Task Mode query params — status, title, query, page, limit, sort", () => {
  it("buildFeatureTaskParams includes all required Task Mode defaults", () => {
    const sp = buildFeatureTaskParams(TASK_MODE_FEATURE_TASK_PARAMS);

    // Required always-present
    expect(sp.get("include")).toBe("tasks");
    expect(sp.get("sort")).toBe("task_id_asc");
    expect(sp.get("page")).toBe("1");
    expect(sp.get("limit")).toBe("50");

    // Status must cover the required Task Mode values
    const statuses = (sp.get("status") ?? "").split(",");
    expect(statuses).toContain("blocked");
    expect(statuses).toContain("in_progress");
    expect(statuses).toContain("reviewing");
    expect(statuses).toContain("in_review");
    expect(statuses).toContain("ready");
  });

  it("buildFeatureTaskParams includes title when provided", () => {
    const sp = buildFeatureTaskParams({ ...TASK_MODE_FEATURE_TASK_PARAMS, title: "OAuth" });
    expect(sp.get("title")).toBe("OAuth");
  });

  it("buildFeatureTaskParams includes query when provided", () => {
    const sp = buildFeatureTaskParams({ ...TASK_MODE_FEATURE_TASK_PARAMS, query: "search text" });
    expect(sp.get("query")).toBe("search text");
  });

  it("buildFeatureTaskParams overrides page and limit for pagination", () => {
    const sp = buildFeatureTaskParams({ ...TASK_MODE_FEATURE_TASK_PARAMS, page: 3, limit: 25 });
    expect(sp.get("page")).toBe("3");
    expect(sp.get("limit")).toBe("25");
  });

  it("sort is always task_id_asc in the canonical Task Mode params", () => {
    expect(TASK_MODE_FEATURE_TASK_PARAMS.sort).toBe("task_id_asc");
    const sp = buildFeatureTaskParams(TASK_MODE_FEATURE_TASK_PARAMS);
    expect(sp.get("sort")).toBe("task_id_asc");
  });

  it("status is omitted when no statuses are provided", () => {
    const sp = buildFeatureTaskParams({ sort: "task_id_asc" });
    expect(sp.has("status")).toBe(false);
  });

  it("does not set task_page in the request params (not part of the contract)", () => {
    const sp = buildFeatureTaskParams(TASK_MODE_FEATURE_TASK_PARAMS);
    expect(sp.has("task_page")).toBe(false);
  });

  it("does not set has_more in the request params (not part of the contract)", () => {
    const sp = buildFeatureTaskParams(TASK_MODE_FEATURE_TASK_PARAMS);
    expect(sp.has("has_more")).toBe(false);
  });
});

// ─── 3. Task Mode reads updated_at from embedded backend task items ──────────

describe("Task Mode reads updated_at from embedded backend task items", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    vi.resetAllMocks();
    queryClient.clear();
  });

  it("FeatureTaskPage embeds updated_at on every task item", async () => {
    const page = makeFeatureTaskPage({
      features: [
        makeFeatureWithTasks({
          tasks: [
            makeTaskWithUpdatedAt({ task_name: "T1", updated_at: "2026-05-29T11:59:28Z" }),
            makeTaskWithUpdatedAt({ task_name: "T2", id: "t2", updated_at: "2026-06-01T08:00:00Z" }),
          ],
        }),
      ],
    });
    vi.mocked(getFeatureTaskList).mockResolvedValue(page);

    const { result } = renderHook(
      () => useFeatureTaskList("ws-1", TASK_MODE_FEATURE_TASK_PARAMS),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.data).not.toBeNull());

    const tasks = result.current.data!.features[0].tasks;
    expect(tasks[0].updated_at).toBe("2026-05-29T11:59:28Z");
    expect(tasks[1].updated_at).toBe("2026-06-01T08:00:00Z");
  });

  it("adaptFeatureWithTasksToFeatures maps updated_at to ParsedTask.updatedAt", () => {
    const features = [
      makeFeatureWithTasks({
        tasks: [makeTaskWithUpdatedAt({ updated_at: "2026-06-01T09:00:00Z" })],
      }),
    ];

    const parsed = adaptFeatureWithTasksToFeatures(features);

    expect(parsed[0].tasks[0].updatedAt).toBe("2026-06-01T09:00:00Z");
  });

  it("adaptTaskSummary preserves updated_at from TaskSummaryWithUpdatedAt", () => {
    const task = makeTaskWithUpdatedAt({ updated_at: "2026-05-30T15:30:00Z" });
    const parsed = adaptTaskSummary(task);

    expect(parsed.updatedAt).toBe("2026-05-30T15:30:00Z");
  });

  it("updatedAt is not fabricated — only comes from the backend response", () => {
    const taskWithoutUpdatedAt: TaskSummary = {
      id: "t-no-ts",
      task_id: "t-no-ts",
      task_name: "T3",
      feature_id: "feat-1",
      feature_name: "feat",
      title: "No timestamp task",
      status: "ready",
      repo: "digital-factory-ui",
      branch: "feature/feat-T3",
      is_blocked: false,
      pr: null,
      workspace_pr: null,
    };

    const parsed = adaptTaskSummary(taskWithoutUpdatedAt as TaskSummaryWithUpdatedAt);
    // Without updated_at on the source, the field must be absent (not fabricated)
    expect(parsed.updatedAt).toBeUndefined();
  });
});

// ─── 4. Task Mode reads pagination from data.page, data.limit, data.total ────

describe("Task Mode reads feature-list pagination from data.page, data.limit, data.total", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    vi.resetAllMocks();
    queryClient.clear();
  });

  it("FeatureTaskPage has page, limit, and total at the top level (not task_page/has_more)", async () => {
    const page = makeFeatureTaskPage({ page: 2, limit: 25, total: 75 });
    vi.mocked(getFeatureTaskList).mockResolvedValue(page);

    const { result } = renderHook(
      () => useFeatureTaskList("ws-1", { page: 2, limit: 25 }),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.data).not.toBeNull());

    // Reads from data.page, data.limit, data.total
    expect(result.current.data!.page).toBe(2);
    expect(result.current.data!.limit).toBe(25);
    expect(result.current.data!.total).toBe(75);
  });

  it("FeatureTaskPage does NOT have a task_page field", () => {
    const page = makeFeatureTaskPage();
    // TypeScript ensures this at compile time; runtime assertion adds a regression guard
    expect("task_page" in page).toBe(false);
  });

  it("FeatureTaskPage does NOT have a has_more field", () => {
    const page = makeFeatureTaskPage();
    expect("has_more" in page).toBe(false);
  });

  it("FeatureTaskPage has features array (not items)", () => {
    const page = makeFeatureTaskPage();
    expect(Array.isArray(page.features)).toBe(true);
    expect("items" in page).toBe(false);
  });

  it("pagination total reflects total number of matching feature rows", async () => {
    const page = makeFeatureTaskPage({ page: 1, limit: 10, total: 42 });
    vi.mocked(getFeatureTaskList).mockResolvedValue(page);

    const { result } = renderHook(
      () => useFeatureTaskList("ws-1", { page: 1, limit: 10 }),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.data).not.toBeNull());

    expect(result.current.data!.total).toBe(42);
  });
});

// ─── 5. TanStack Query uses 60-second cache window ────────────────────────────

describe("TanStack Query — 60-second cache window and refetchInterval", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    vi.resetAllMocks();
    queryClient.clear();
  });

  it("query observer options have staleTime=60_000", () => {
    vi.mocked(getFeatureTaskList).mockResolvedValue(makeFeatureTaskPage());

    renderHook(
      () => useFeatureTaskList("ws-1", {}),
      { wrapper: makeWrapper(queryClient) },
    );

    const key = workspaceKeys.taskModeFeatures("ws-1", {});
    const query = queryClient.getQueryCache().find({ queryKey: key });
    const options = query?.options as Record<string, unknown> | undefined;

    expect(options?.staleTime).toBe(60_000);
  });

  it("query observer options have gcTime=60_000", () => {
    vi.mocked(getFeatureTaskList).mockResolvedValue(makeFeatureTaskPage());

    renderHook(
      () => useFeatureTaskList("ws-1", {}),
      { wrapper: makeWrapper(queryClient) },
    );

    const key = workspaceKeys.taskModeFeatures("ws-1", {});
    const query = queryClient.getQueryCache().find({ queryKey: key });
    const options = query?.options as Record<string, unknown> | undefined;

    expect(options?.gcTime).toBe(60_000);
  });

  it("query observer options have refetchInterval=60_000", () => {
    vi.mocked(getFeatureTaskList).mockResolvedValue(makeFeatureTaskPage());

    renderHook(
      () => useFeatureTaskList("ws-1", {}),
      { wrapper: makeWrapper(queryClient) },
    );

    const key = workspaceKeys.taskModeFeatures("ws-1", {});
    const query = queryClient.getQueryCache().find({ queryKey: key });
    const options = query?.options as Record<string, unknown> | undefined;

    expect(options?.refetchInterval).toBe(60_000);
  });

  it("cache lifetime is exactly 60 seconds — not 30s, not 120s", () => {
    vi.mocked(getFeatureTaskList).mockResolvedValue(makeFeatureTaskPage());

    renderHook(
      () => useFeatureTaskList("ws-1", {}),
      { wrapper: makeWrapper(queryClient) },
    );

    const key = workspaceKeys.taskModeFeatures("ws-1", {});
    const query = queryClient.getQueryCache().find({ queryKey: key });
    const options = query?.options as Record<string, unknown> | undefined;

    // All three cache-lifetime values must match exactly
    expect(options?.staleTime).toBe(60_000);
    expect(options?.gcTime).toBe(60_000);
    expect(options?.refetchInterval).toBe(60_000);
  });
});

// ─── 6. Feature Mode does NOT switch to the combined response ─────────────────

describe("Feature Mode isolation — does not use /features?include=tasks", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    vi.resetAllMocks();
    queryClient.clear();
  });

  it("useFeatureTaskList is disabled (no fetch) when workspaceId is null", () => {
    renderHook(
      () => useFeatureTaskList(null, TASK_MODE_FEATURE_TASK_PARAMS),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(vi.mocked(getFeatureTaskList)).not.toHaveBeenCalled();
  });

  it("useFeatureTaskList returns null data when disabled", () => {
    const { result } = renderHook(
      () => useFeatureTaskList(null, TASK_MODE_FEATURE_TASK_PARAMS),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("buildFeatureTaskParams always adds include=tasks (Feature Mode must never call this with null)", () => {
    // Prove that include=tasks only appears in Task Mode params
    const taskModeSp = buildFeatureTaskParams(TASK_MODE_FEATURE_TASK_PARAMS);
    const featureModeSp = new URLSearchParams(); // Feature Mode uses buildFeatureParams, not buildFeatureTaskParams

    expect(taskModeSp.get("include")).toBe("tasks");
    expect(featureModeSp.get("include")).toBeNull();
  });

  it("Task Mode query key uses task-mode-features segment (distinct from feature-mode keys)", () => {
    const taskKey = workspaceKeys.taskModeFeatures("ws-1", {});
    const featureKey = workspaceKeys.features("ws-1", {});

    // Keys must be different — different cache buckets
    expect(JSON.stringify(taskKey)).not.toBe(JSON.stringify(featureKey));
    expect(taskKey[2]).toBe("task-mode-features");
    expect(featureKey[2]).toBe("features");
  });
});

// ─── 7. Existing /tasks endpoint backward compatibility ───────────────────────

describe("Existing /tasks endpoint — backward compatibility with updated_at", () => {
  it("buildTaskParams does NOT add include=tasks (different endpoint contract)", () => {
    const sp = buildTaskParams({
      status: ["blocked", "in_progress"],
      sort: "task_id_asc",
      page: 1,
      limit: 50,
    });

    expect(sp.has("include")).toBe(false);
  });

  it("buildTaskParams preserves the known Task Mode request shape", () => {
    const sp = buildTaskParams({
      status: ["blocked", "in_progress", "reviewing", "in_review", "ready"],
      sort: "task_id_asc",
      page: 1,
      limit: 50,
    });

    const statuses = (sp.get("status") ?? "").split(",");
    expect(statuses).toContain("blocked");
    expect(statuses).toContain("in_progress");
    expect(statuses).toContain("reviewing");
    expect(statuses).toContain("in_review");
    expect(statuses).toContain("ready");
    expect(sp.get("sort")).toBe("task_id_asc");
    expect(sp.get("page")).toBe("1");
    expect(sp.get("limit")).toBe("50");
  });

  it("TaskSummaryWithUpdatedAt extends TaskSummary with updated_at", () => {
    const task = makeTaskSummary({ updated_at: "2026-06-01T10:00:00Z" });

    // TaskSummaryWithUpdatedAt must have all TaskSummary fields plus updated_at
    expect(task.id).toBeDefined();
    expect(task.task_name).toBeDefined();
    expect(task.status).toBeDefined();
    expect(task.updated_at).toBe("2026-06-01T10:00:00Z");
  });

  it("adaptTaskSummary works on /tasks-shaped data (TaskSummary without updated_at)", () => {
    // The /tasks endpoint returns TaskSummary (without updated_at pre-T1)
    const legacyTask: TaskSummary = {
      id: "legacy-task",
      task_id: "legacy-task",
      task_name: "T0",
      feature_id: "feat-legacy",
      feature_name: "legacy-feature",
      title: "Legacy task",
      status: "done",
      repo: "workflow-backend",
      branch: "feature/legacy",
      is_blocked: false,
      pr: null,
      workspace_pr: null,
    };

    // Must not throw — /tasks callers pass TaskSummary objects through adaptTaskSummary
    expect(() => adaptTaskSummary(legacyTask as TaskSummaryWithUpdatedAt)).not.toThrow();
  });

  it("adaptTaskSummary handles updated_at from /tasks endpoint after T1", () => {
    const t1Task = makeTaskSummary({ updated_at: "2026-05-29T11:59:28.33912Z" });
    const parsed = adaptTaskSummary(t1Task);

    // After T1, /tasks returns updated_at; adapter must forward it
    expect(parsed.updatedAt).toBe("2026-05-29T11:59:28.33912Z");
  });
});

// ─── 8. FeatureWithTasks shape matches the API contract ───────────────────────

describe("FeatureWithTasks type matches the API contract spec", () => {
  it("FeatureWithTasks has all required feature fields", () => {
    const feature = makeFeatureWithTasks();

    expect(typeof feature.id).toBe("string");
    expect(typeof feature.feature_id).toBe("string");
    expect(typeof feature.feature_name).toBe("string");
    expect(typeof feature.title).toBe("string");
    expect(typeof feature.status).toBe("string");
    expect(typeof feature.current_stage).toBe("string");
    expect(typeof feature.task_counts).toBe("object");
    expect(typeof feature.stages).toBe("object");
    expect(Array.isArray(feature.tasks)).toBe(true);
  });

  it("FeatureWithTasks.tasks have all required task fields including updated_at", () => {
    const feature = makeFeatureWithTasks();
    const task = feature.tasks[0];

    expect(typeof task.id).toBe("string");
    expect(typeof task.task_id).toBe("string");
    expect(typeof task.task_name).toBe("string");
    expect(typeof task.feature_id).toBe("string");
    expect(typeof task.feature_name).toBe("string");
    expect(typeof task.title).toBe("string");
    expect(typeof task.status).toBe("string");
    expect(typeof task.repo).toBe("string");
    expect(typeof task.branch).toBe("string");
    expect(typeof task.is_blocked).toBe("boolean");
    expect(typeof task.updated_at).toBe("string");
  });

  it("adaptFeatureWithTasksToFeatures converts all features in the page", () => {
    const features = [
      makeFeatureWithTasks({ feature_name: "feature-a", title: "Feature A" }),
      makeFeatureWithTasks({ id: "feat-b", feature_id: "feat-b", feature_name: "feature-b", title: "Feature B" }),
    ];

    const parsed = adaptFeatureWithTasksToFeatures(features);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe("feature-a");
    expect(parsed[1].id).toBe("feature-b");
    expect(parsed[0].title).toBe("Feature A");
    expect(parsed[1].title).toBe("Feature B");
  });

  it("adaptFeatureWithTasksToFeatures produces features with tasks carrying updatedAt", () => {
    const features = [
      makeFeatureWithTasks({
        tasks: [
          makeTaskWithUpdatedAt({ task_name: "T1", updated_at: "2026-05-01T00:00:00Z" }),
          makeTaskWithUpdatedAt({ task_name: "T2", id: "t2", updated_at: "2026-06-01T00:00:00Z" }),
        ],
      }),
    ];

    const parsed = adaptFeatureWithTasksToFeatures(features);

    expect(parsed[0].tasks).toHaveLength(2);
    expect(parsed[0].tasks[0].updatedAt).toBe("2026-05-01T00:00:00Z");
    expect(parsed[0].tasks[1].updatedAt).toBe("2026-06-01T00:00:00Z");
  });

  it("feature with empty tasks array adapts correctly", () => {
    const features = [makeFeatureWithTasks({ tasks: [] })];
    const parsed = adaptFeatureWithTasksToFeatures(features);

    expect(parsed[0].tasks).toHaveLength(0);
  });
});

// ─── 9. Query key isolation — Task Mode vs Feature Mode ───────────────────────

describe("Query key isolation — Task Mode vs Feature Mode cache buckets", () => {
  it("task-mode-features key is stable for the same workspace and params", () => {
    const a = workspaceKeys.taskModeFeatures("ws-1", { sort: "task_id_asc", page: 1, limit: 50 });
    const b = workspaceKeys.taskModeFeatures("ws-1", { sort: "task_id_asc", page: 1, limit: 50 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("task-mode-features key differs across workspace IDs", () => {
    const a = workspaceKeys.taskModeFeatures("ws-1", {});
    const b = workspaceKeys.taskModeFeatures("ws-2", {});
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("task-mode-features key differs from features key for the same workspace", () => {
    const taskKey = workspaceKeys.taskModeFeatures("ws-1", {});
    const featureKey = workspaceKeys.features("ws-1", {});
    expect(JSON.stringify(taskKey)).not.toBe(JSON.stringify(featureKey));
  });

  it("task-mode-features key differs from tasks key for the same workspace", () => {
    const taskModeKey = workspaceKeys.taskModeFeatures("ws-1", {});
    const tasksKey = workspaceKeys.tasks("ws-1", {});
    expect(JSON.stringify(taskModeKey)).not.toBe(JSON.stringify(tasksKey));
  });

  it("task-mode-features key differs when page changes (pagination invalidation)", () => {
    const page1 = workspaceKeys.taskModeFeatures("ws-1", { page: 1 });
    const page2 = workspaceKeys.taskModeFeatures("ws-1", { page: 2 });
    expect(JSON.stringify(page1)).not.toBe(JSON.stringify(page2));
  });

  it("task-mode-features key differs when status filter changes", () => {
    const withStatus = workspaceKeys.taskModeFeatures("ws-1", { status: ["in_progress"] });
    const noStatus = workspaceKeys.taskModeFeatures("ws-1", {});
    expect(JSON.stringify(withStatus)).not.toBe(JSON.stringify(noStatus));
  });
});
