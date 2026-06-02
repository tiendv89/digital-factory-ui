/**
 * T4 — Wire Task Mode kanban to feature-task API
 *
 * Verifies:
 *   - Task Mode renders features from FeatureTaskPage (backendTaskResults)
 *   - Task Mode renders task rows from features[].tasks[]
 *   - Task cards display backend-provided updated_at
 *   - Status filtering: backendTaskResults reflects filtered features
 *   - Search: backendTaskResults reflects text-searched features
 *   - Pagination: Task Mode reads page/limit/total from FeatureTaskPage
 *   - Feature Mode and task list flows are not affected
 *   - adaptFeatureWithTasksToFeatures converts FeatureWithTasks[] to ParsedFeature[]
 *   - adaptTaskSummary preserves updated_at from TaskSummaryWithUpdatedAt
 */

// @vitest-environment jsdom

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ParsedFeature } from "../services/yaml-parser";
import type { ActiveFilters, FeatureActiveFilters } from "../features/board/types";
import type { FeatureTaskPage, FeatureWithTasks, TaskSummaryWithUpdatedAt } from "../services/workflow-backend/types";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../services/workflow-backend/client", () => ({
  getFeatureTaskList: vi.fn(),
}));

import { getFeatureTaskList } from "../services/workflow-backend/client";

// ─── Imports under test ───────────────────────────────────────────────────────

import { TaskBoardView } from "../features/board/components/TaskBoardView/TaskBoardView";
import { adaptFeatureWithTasksToFeatures } from "../features/workspaces/lib/workspaceAdapter";
import { adaptTaskSummary } from "../features/workspaces/lib/workspaceAdapter";
import { useFeatureTaskList } from "../features/tasks/hooks/useFeatureTaskList";
import { TASK_MODE_FEATURE_TASK_PARAMS } from "../services/workflow-backend/query-params";

// ─── Board context mock ────────────────────────────────────────────────────────

const mockContextRef = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("../features/board/components/KanbanBoard/KanbanBoard.context", () => ({
  useBoardContext: () => mockContextRef.current,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTaskWithUpdatedAt(overrides: Partial<TaskSummaryWithUpdatedAt> = {}): TaskSummaryWithUpdatedAt {
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

// ─── Context factory ──────────────────────────────────────────────────────────

function buildContext(opts: {
  features?: ParsedFeature[];
  backendTaskResults?: ParsedFeature[] | null;
  taskSearching?: boolean;
  taskSearchError?: { kind: "network_error"; message: string; retryable?: boolean } | null;
  taskPagination?: { total: number; page: number; limit: number } | null;
  expandedFeatureIds?: Set<string>;
  taskLimit?: number;
}) {
  const taskFilters: ActiveFilters = { statuses: [] };
  const featureFilters: FeatureActiveFilters = { statuses: [] };

  return {
    workspaceDetail: {
      id: "ws-uuid-1",
      name: "workspace",
      slug: "workspace",
      repo_url: "https://github.com/test/repo",
      source_state: { stale: false },
      updated_at: "2026-01-01T00:00:00Z",
      features: [],
      tasks: [],
    },
    features: opts.features ?? [],
    trackedFeatures: [],
    loading: false,
    error: null,
    reload: vi.fn(),
    boardMode: "task" as const,
    setBoardMode: vi.fn(),
    taskSearchQuery: "",
    setTaskSearchQuery: vi.fn(),
    taskActiveFilters: taskFilters,
    setTaskActiveFilters: vi.fn(),
    featureSearchQuery: "",
    setFeatureSearchQuery: vi.fn(),
    featureActiveFilters: featureFilters,
    setFeatureActiveFilters: vi.fn(),
    searchQuery: "",
    setSearchQuery: vi.fn(),
    activeFilters: taskFilters,
    setActiveFilters: vi.fn(),
    expandedFeatureIds: opts.expandedFeatureIds ?? new Set<string>(),
    toggleFeature: vi.fn(),
    syncing: false,
    syncError: null,
    syncBoard: vi.fn(),
    backendTaskResults: opts.backendTaskResults !== undefined ? opts.backendTaskResults : null,
    backendFeatureResults: null,
    taskSearching: opts.taskSearching ?? false,
    featureSearching: false,
    taskSearchError: opts.taskSearchError ?? null,
    featureSearchError: null,
    openTaskTab: vi.fn(),
    openTaskTabNewSession: vi.fn(),
    openFeatureTab: vi.fn(),
    openFeatureTabNewSession: vi.fn(),
    taskPage: 1,
    featurePage: 1,
    setTaskPage: vi.fn(),
    setFeaturePage: vi.fn(),
    taskPagination: opts.taskPagination ?? null,
    featurePagination: null,
    taskLimit: opts.taskLimit ?? 50,
    setTaskLimit: vi.fn(),
    featureLimit: 100,
    setFeatureLimit: vi.fn(),
  };
}

function makeFeature(overrides: Partial<ParsedFeature> = {}): ParsedFeature {
  return {
    id: "my-feature",
    title: "My Feature",
    featureStatus: "in_implementation",
    tasks: [],
    ...overrides,
  };
}

function makeTask(id: string, title: string, status: string, updatedAt?: string) {
  return { id, title, status, dependsOn: [], ...(updatedAt ? { updatedAt } : {}) };
}

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

// ─── adaptFeatureWithTasksToFeatures ─────────────────────────────────────────

describe("adaptFeatureWithTasksToFeatures", () => {
  it("converts FeatureWithTasks[] to ParsedFeature[]", () => {
    const features = [makeFeatureWithTasks()];
    const result = adaptFeatureWithTasksToFeatures(features);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("my-feature");
    expect(result[0].title).toBe("My Feature");
    expect(result[0].featureStatus).toBe("in_implementation");
    expect(result[0].backendId).toBe("feat-uuid-1");
  });

  it("embeds tasks with updated_at on each ParsedTask", () => {
    const features = [makeFeatureWithTasks()];
    const result = adaptFeatureWithTasksToFeatures(features);

    const task = result[0].tasks[0];
    expect(task.id).toBe("T1");
    expect(task.status).toBe("in_progress");
    expect(task.updatedAt).toBe("2026-05-29T11:59:28Z");
  });

  it("returns empty tasks when feature has no tasks", () => {
    const features = [makeFeatureWithTasks({ tasks: [] })];
    const result = adaptFeatureWithTasksToFeatures(features);

    expect(result[0].tasks).toHaveLength(0);
  });

  it("handles multiple features", () => {
    const features = [
      makeFeatureWithTasks({ id: "feat-a", feature_name: "feature-a", title: "Feature A" }),
      makeFeatureWithTasks({ id: "feat-b", feature_name: "feature-b", title: "Feature B" }),
    ];
    const result = adaptFeatureWithTasksToFeatures(features);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("feature-a");
    expect(result[1].id).toBe("feature-b");
  });

  it("sets taskCounts and currentStage from FeatureWithTasks", () => {
    const features = [
      makeFeatureWithTasks({
        task_counts: { total: 5, done: 3, in_progress: 1, blocked: 0, ready: 1, todo: 0 },
        current_stage: "tasks",
      }),
    ];
    const result = adaptFeatureWithTasksToFeatures(features);

    expect(result[0].taskCounts?.total).toBe(5);
    expect(result[0].taskCounts?.done).toBe(3);
    expect(result[0].currentStage).toBe("tasks");
  });
});

// ─── adaptTaskSummary with updated_at ─────────────────────────────────────────

describe("adaptTaskSummary — updated_at field", () => {
  it("includes updatedAt when task has updated_at", () => {
    const task = makeTaskWithUpdatedAt({ updated_at: "2026-05-30T10:00:00Z" });
    const result = adaptTaskSummary(task);

    expect(result.updatedAt).toBe("2026-05-30T10:00:00Z");
  });

  it("does not include updatedAt when task lacks updated_at", () => {
    const task = makeTaskWithUpdatedAt({ updated_at: undefined as unknown as string });
    const result = adaptTaskSummary(task as TaskSummaryWithUpdatedAt);

    expect(result.updatedAt).toBeUndefined();
  });

  it("preserves other task fields alongside updated_at", () => {
    const task = makeTaskWithUpdatedAt({
      task_name: "T2",
      title: "Important task",
      status: "reviewing",
      updated_at: "2026-06-01T09:00:00Z",
    });
    const result = adaptTaskSummary(task);

    expect(result.id).toBe("T2");
    expect(result.title).toBe("Important task");
    expect(result.status).toBe("reviewing");
    expect(result.updatedAt).toBe("2026-06-01T09:00:00Z");
  });
});

// ─── TaskBoardView — renders from backendTaskResults (feature-task API) ───────

describe("TaskBoardView — renders from feature-task API results", () => {
  it("renders features from backendTaskResults when non-null", () => {
    const feature = makeFeature({
      id: "api-feature",
      title: "API Feature",
      tasks: [makeTask("T1", "API task title", "in_progress")],
    });

    mockContextRef.current = buildContext({
      features: [],
      backendTaskResults: [feature],
      expandedFeatureIds: new Set(["api-feature"]),
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).toContain("API task title");
  });

  it("falls back to workspace features when backendTaskResults is null", () => {
    const feature = makeFeature({
      id: "ws-feature",
      title: "Workspace Feature",
      tasks: [makeTask("T1", "Workspace task", "in_progress")],
    });

    mockContextRef.current = buildContext({
      features: [feature],
      backendTaskResults: null,
      expandedFeatureIds: new Set(["ws-feature"]),
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).toContain("Workspace task");
  });

  it("shows empty state when backendTaskResults is an empty array", () => {
    mockContextRef.current = buildContext({
      features: [makeFeature()],
      backendTaskResults: [],
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).toContain("No tasks match");
  });

  it("shows loading state when taskSearching is true", () => {
    mockContextRef.current = buildContext({
      features: [],
      backendTaskResults: null,
      taskSearching: true,
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).toContain("Searching...");
  });
});

// ─── TaskBoardView — status filtering ─────────────────────────────────────────

describe("TaskBoardView — status filtering renders correct tasks", () => {
  it("renders only tasks with the filtered status from backendTaskResults", () => {
    const feature = makeFeature({
      id: "filtered-feature",
      tasks: [
        makeTask("T1", "Blocked task", "blocked"),
        makeTask("T2", "Ready task", "ready"),
      ],
    });

    mockContextRef.current = buildContext({
      backendTaskResults: [feature],
      expandedFeatureIds: new Set(["filtered-feature"]),
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    // Both tasks are in backendTaskResults (already filtered by backend)
    expect(html).toContain("Blocked task");
    expect(html).toContain("Ready task");
  });

  it("shows empty state when backend returns no features for status filter", () => {
    mockContextRef.current = buildContext({
      features: [makeFeature()],
      backendTaskResults: [],
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).toContain("No tasks match");
  });
});

// ─── TaskBoardView — search results ───────────────────────────────────────────

describe("TaskBoardView — search renders tasks from feature-task API", () => {
  it("renders search results from backendTaskResults", () => {
    const feature = makeFeature({
      id: "search-feature",
      title: "Search Feature",
      tasks: [makeTask("T1", "OAuth integration task", "in_progress")],
    });

    mockContextRef.current = buildContext({
      backendTaskResults: [feature],
      expandedFeatureIds: new Set(["search-feature"]),
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).toContain("OAuth integration task");
  });

  it("shows empty message when search returns no features", () => {
    mockContextRef.current = buildContext({
      features: [makeFeature()],
      backendTaskResults: [],
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).toContain("No tasks match");
  });
});

// ─── TaskBoardView — pagination from FeatureTaskPage ──────────────────────────

describe("TaskBoardView — pagination from feature-task API", () => {
  it("renders PaginationControls when taskPagination is present", () => {
    const feature = makeFeature({ tasks: [makeTask("T1", "Task", "in_progress")] });

    mockContextRef.current = buildContext({
      backendTaskResults: [feature],
      taskPagination: { total: 150, page: 1, limit: 50 },
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    // PaginationControls renders when taskPagination is set
    expect(html).toContain("150"); // total shown in pagination
  });

  it("does not render PaginationControls when taskPagination is null", () => {
    const feature = makeFeature({ tasks: [makeTask("T1", "Task", "in_progress")] });

    mockContextRef.current = buildContext({
      backendTaskResults: [feature],
      taskPagination: null,
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    // Check that pagination div is absent (no of X text)
    expect(html).not.toContain("of 0");
    expect(html).not.toContain("Next");
  });

  it("pagination reads page from FeatureTaskPage data.page", () => {
    const feature = makeFeature({ tasks: [makeTask("T1", "Task", "in_progress")] });

    mockContextRef.current = buildContext({
      backendTaskResults: [feature],
      taskPagination: { total: 200, page: 3, limit: 50 },
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    // Page 3 with limit 50 means items 101-150 of 200
    expect(html).toContain("101");
  });
});

// ─── TaskBoardView — displayed updated_at ─────────────────────────────────────

describe("TaskBoardView — displays backend-provided updated_at on task cards", () => {
  it("renders updated_at on task cards when present", () => {
    const feature = makeFeature({
      id: "ts-feature",
      tasks: [makeTask("T1", "Timestamped task", "in_progress", "2026-05-29T11:59:28Z")],
    });

    mockContextRef.current = buildContext({
      backendTaskResults: [feature],
      expandedFeatureIds: new Set(["ts-feature"]),
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    // The task card renders a data-task-updated-at attribute
    expect(html).toContain("data-task-updated-at=\"2026-05-29T11:59:28Z\"");
  });

  it("does not render updated_at element when task has no updatedAt", () => {
    const feature = makeFeature({
      id: "no-ts-feature",
      tasks: [makeTask("T1", "No timestamp task", "in_progress")],
    });

    mockContextRef.current = buildContext({
      backendTaskResults: [feature],
      expandedFeatureIds: new Set(["no-ts-feature"]),
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).not.toContain("data-task-updated-at");
  });

  it("updated_at comes from the backend FeatureTaskPage embedded tasks", () => {
    const backendFeature = makeFeatureWithTasks({
      feature_name: "backend-feature",
      tasks: [makeTaskWithUpdatedAt({ task_name: "T3", updated_at: "2026-06-01T08:00:00Z" })],
    });
    const parsedFeatures = adaptFeatureWithTasksToFeatures([backendFeature]);

    // The adapted ParsedTask must carry updatedAt from the backend
    const parsedTask = parsedFeatures[0].tasks[0];
    expect(parsedTask.updatedAt).toBe("2026-06-01T08:00:00Z");
  });
});

// ─── useFeatureTaskList — Task Mode default params ─────────────────────────────

describe("useFeatureTaskList — Task Mode params", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    vi.resetAllMocks();
    queryClient.clear();
  });

  it("fetches with include=tasks using TASK_MODE_FEATURE_TASK_PARAMS defaults", async () => {
    const page = makeFeatureTaskPage();
    vi.mocked(getFeatureTaskList).mockResolvedValue(page);

    const { result } = renderHook(
      () => useFeatureTaskList("ws-uuid-1", TASK_MODE_FEATURE_TASK_PARAMS),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.data).not.toBeNull());

    const [calledWorkspaceId, calledParams] = vi.mocked(getFeatureTaskList).mock.calls[0];
    expect(calledWorkspaceId).toBe("ws-uuid-1");
    // calledParams is URLSearchParams — must include include=tasks
    const sp = calledParams as URLSearchParams;
    expect(sp.get("include")).toBe("tasks");
  });

  it("returns FeatureTaskPage with page/limit/total for pagination", async () => {
    const page = makeFeatureTaskPage({ page: 2, limit: 25, total: 75 });
    vi.mocked(getFeatureTaskList).mockResolvedValue(page);

    const { result } = renderHook(
      () => useFeatureTaskList("ws-uuid-1", { page: 2, limit: 25, sort: "task_id_asc" }),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.data).not.toBeNull());

    expect(result.current.data?.page).toBe(2);
    expect(result.current.data?.limit).toBe(25);
    expect(result.current.data?.total).toBe(75);
  });

  it("returns embedded tasks with updated_at from the API response", async () => {
    const page = makeFeatureTaskPage();
    vi.mocked(getFeatureTaskList).mockResolvedValue(page);

    const { result } = renderHook(
      () => useFeatureTaskList("ws-uuid-1", TASK_MODE_FEATURE_TASK_PARAMS),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.data).not.toBeNull());

    const task = result.current.data?.features[0].tasks[0];
    expect(task?.updated_at).toBe("2026-05-29T11:59:28Z");
  });

  it("disables fetch when workspaceId is null (Task Mode inactive)", () => {
    renderHook(
      () => useFeatureTaskList(null, TASK_MODE_FEATURE_TASK_PARAMS),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(vi.mocked(getFeatureTaskList)).not.toHaveBeenCalled();
  });
});

// ─── TASK_MODE_FEATURE_TASK_PARAMS — correct defaults ─────────────────────────

describe("TASK_MODE_FEATURE_TASK_PARAMS — Task Mode defaults", () => {
  it("uses task_id_asc sort", () => {
    expect(TASK_MODE_FEATURE_TASK_PARAMS.sort).toBe("task_id_asc");
  });

  it("starts on page 1 with limit 50", () => {
    expect(TASK_MODE_FEATURE_TASK_PARAMS.page).toBe(1);
    expect(TASK_MODE_FEATURE_TASK_PARAMS.limit).toBe(50);
  });

  it("includes the Task Mode status set", () => {
    const statuses = TASK_MODE_FEATURE_TASK_PARAMS.status as string[];
    expect(statuses).toContain("blocked");
    expect(statuses).toContain("in_progress");
    expect(statuses).toContain("reviewing");
    expect(statuses).toContain("in_review");
    expect(statuses).toContain("ready");
  });
});
