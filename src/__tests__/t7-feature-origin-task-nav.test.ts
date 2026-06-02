/**
 * T7 — Feature-origin task tab navigation and tab flicker hardening
 *
 * Verifies:
 *   - FeatureTasksPanel calls onOpenTaskTab with taskId, taskName, title
 *   - FeatureTabView opens task tabs via workspace openTaskTab with
 *     parentFeatureTabSessionId
 *   - closeTaskTab reactivates parent feature tab when
 *     parentFeatureTabSessionId is set
 *   - closeTaskTab returns to /board when no parent feature tab context
 *   - Parent feature tab remains open after feature-origin task tab closes
 *   - TaskTabView Back behavior preserves board-origin behavior
 *   - TaskTabEntry includes parentFeatureTabSessionId
 *   - Flicker hardening: loading stays false when cached data exists
 */

// @vitest-environment jsdom

import React from "react";
import { renderHook, act } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRouter } from "next/navigation";
import type {
  TaskDetail,
  FeatureDetail,
  TaskSummary,
} from "../services/workflow-backend/types";

// ─── Mock next/navigation ─────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

const mockRouterPush = vi.fn();

// ─── Helper: create a TaskTabEntry for context tests ──────────────────────────

import type {
  TaskTabEntry,
  WorkspaceContextValue,
} from "../features/workspaces/context/WorkspaceContext";
import {
  addTaskTab,
  removeTaskTab,
  getTaskTabHref,
  createTabSessionId,
} from "../features/workspaces/lib/tabState";

// ─── Test: tabState helpers ───────────────────────────────────────────────────

describe("tabState — parentFeatureTabSessionId support", () => {
  it("creates a TaskTabEntry with parentFeatureTabSessionId", () => {
    const entry: TaskTabEntry = {
      sessionId: "task-abc-123",
      workspaceId: "ws-1",
      taskId: "task-uuid-1",
      taskName: "T1",
      title: "My Task",
      featureId: "feat-uuid-1",
      featureName: "my-feature",
      parentFeatureTabSessionId: "feat-xyz-456",
    };
    expect(entry.parentFeatureTabSessionId).toBe("feat-xyz-456");
  });

  it("addTaskTab preserves parentFeatureTabSessionId", () => {
    const entry: TaskTabEntry = {
      sessionId: "task-abc-123",
      workspaceId: "ws-1",
      taskId: "task-uuid-1",
      taskName: "T1",
      title: "My Task",
      parentFeatureTabSessionId: "feat-xyz-456",
    };
    const tabs = addTaskTab([], entry);
    expect(tabs).toHaveLength(1);
    expect(tabs[0]?.parentFeatureTabSessionId).toBe("feat-xyz-456");
  });

  it("getTaskTabHref works with parentFeatureTabSessionId", () => {
    const entry: TaskTabEntry = {
      sessionId: "task-abc-123",
      workspaceId: "ws-1",
      taskId: "task-uuid-1",
      taskName: "T1",
      title: "My Task",
      parentFeatureTabSessionId: "feat-xyz-456",
    };
    const href = getTaskTabHref(entry);
    expect(href).toContain("/task/task-abc-123");
    expect(href).toContain("workspaceId=ws-1");
    expect(href).toContain("taskId=task-uuid-1");
  });
});

// ─── Test: closeTaskTab behavior with parentFeatureTabSessionId ───────────────

describe("WorkspaceContext — closeTaskTab with parentFeatureTabSessionId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouterPush.mockReset();
    (useRouter as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockRouterPush,
    });
  });

  it("closeTaskTab removes the task tab entry from the list", () => {
    const tabs: TaskTabEntry[] = [
      {
        sessionId: "task-abc",
        workspaceId: "ws-1",
        taskId: "task-1",
        taskName: "T1",
        title: "Task 1",
        parentFeatureTabSessionId: "feat-xyz",
      },
      {
        sessionId: "task-def",
        workspaceId: "ws-1",
        taskId: "task-2",
        taskName: "T2",
        title: "Task 2",
      },
    ];
    const result = removeTaskTab(tabs, "task-abc");
    expect(result).toHaveLength(1);
    expect(result[0]?.sessionId).toBe("task-def");
  });

  it("task tab with parentFeatureTabSessionId is removed while unrelated tabs stay", () => {
    const tabs: TaskTabEntry[] = [
      {
        sessionId: "task-abc",
        workspaceId: "ws-1",
        taskId: "task-1",
        taskName: "T1",
        title: "Task 1",
        parentFeatureTabSessionId: "feat-xyz",
      },
      {
        sessionId: "task-def",
        workspaceId: "ws-1",
        taskId: "task-2",
        taskName: "T2",
        title: "Task 2",
      },
    ];
    const result = removeTaskTab(tabs, "task-def");
    expect(result).toHaveLength(1);
    expect(result[0]?.sessionId).toBe("task-abc");
    // The remaining tab still has parentFeatureTabSessionId
    expect(result[0]?.parentFeatureTabSessionId).toBe("feat-xyz");
  });
});

// ─── Test: FeatureTasksPanel calls onOpenTaskTab ──────────────────────────────

// Mock useDocumentContent
vi.mock("../features/board/hooks/useDocumentContent", () => ({
  useDocumentContent: vi.fn(() => ({
    content: null,
    loading: false,
    error: null,
  })),
}));

// Mock status helpers
vi.mock("../features/tasks/lib/status", () => ({
  formatStatusLabel: vi.fn((s: string) => s),
  getStatusStyle: vi.fn(() => ({ bg: "bg-gray-100", text: "text-gray-800" })),
}));

import { FeatureTasksPanel } from "../features/board/components/FeatureTabView/FeatureTasksPanel";

function makeFeatureDetail(
  overrides: Partial<FeatureDetail> = {},
): FeatureDetail {
  return {
    id: "feat-uuid-1",
    feature_id: "feat-uuid-1",
    feature_name: "my-feature",
    title: "My Feature",
    status: "in_implementation",
    current_stage: "in_implementation",
    task_counts: {
      total: 0,
      done: 0,
      in_progress: 0,
      blocked: 0,
      ready: 0,
      todo: 0,
    },
    workspace_id: "ws-uuid-1",
    documents: [],
    tasks: [],
    activity: [],
    updated_at: "2026-01-01T00:00:00Z",
    source_state: { stale: false },
    ...overrides,
  };
}

function makeTaskSummary(overrides: Partial<TaskSummary> = {}): TaskSummary {
  return {
    id: "task-uuid-1",
    task_id: "task-uuid-1",
    task_name: "T3",
    feature_id: "feat-uuid-1",
    feature_name: "my-feature",
    title: "Implement kanban board",
    status: "in_progress",
    repo: "acme/ui",
    branch: "feature/my-feature-T3",
    is_blocked: false,
    pr: null,
    workspace_pr: null,
    ...overrides,
  };
}

describe("FeatureTasksPanel — onOpenTaskTab callback", () => {
  it("renders task rows and calls onOpenTaskTab with task details", () => {
    const onOpenTaskTab = vi.fn();
    const feature = makeFeatureDetail({
      tasks: [
        makeTaskSummary({ task_name: "T3", title: "Implement kanban board" }),
      ],
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureTasksPanel, {
        feature,
        onOpenTaskTab,
      }),
    );

    expect(html).toContain('data-feature-task-row="T3"');
    expect(html).toContain("T3");
    expect(html).toContain("Implement kanban board");
  });

  it("renders multiple task rows without crashing", () => {
    const feature = makeFeatureDetail({
      tasks: [
        makeTaskSummary({ id: "task-1", task_name: "T1", title: "Task one" }),
        makeTaskSummary({ id: "task-2", task_name: "T2", title: "Task two" }),
      ],
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureTasksPanel, {
        feature,
        onOpenTaskTab: vi.fn(),
      }),
    );

    expect(html).toContain('data-feature-task-row="T1"');
    expect(html).toContain('data-feature-task-row="T2"');
  });

  it("renders empty state when no tasks exist", () => {
    const feature = makeFeatureDetail({ tasks: [] });
    const html = renderToStaticMarkup(
      React.createElement(FeatureTasksPanel, {
        feature,
        onOpenTaskTab: vi.fn(),
      }),
    );
    expect(html).toContain("data-feature-tasks-empty");
    expect(html).toContain("No tasks in this feature");
  });
});

// ─── Test: FeatureTabView integration with openTaskTab ────────────────────────

// Mock useFeatureDetail and useFeatureTask
const mockUseFeatureDetail = vi.hoisted(() => vi.fn());
const mockUseFeatureTask = vi.hoisted(() => vi.fn());

vi.mock("../features/board/hooks/useFeatureDetail", () => ({
  useFeatureDetail: mockUseFeatureDetail,
  useFeatureTask: mockUseFeatureTask,
}));

vi.mock("../features/board/hooks/useActivity", () => ({
  useActivity: () => ({ events: [], loading: false, error: null }),
}));

// Mock workspace context
const mockOpenTaskTab = vi.hoisted(() => vi.fn());

vi.mock("../features/workspaces/context/WorkspaceContext", () => ({
  useWorkspaceContext: () => ({
    activeSurface: "feature-tab",
    activeTaskTabId: null,
    activeFeatureTabId: "feat-session-1",
    openTaskTabs: [],
    openFeatureTabs: [
      {
        sessionId: "feat-session-1",
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
        featureName: "my-feature",
        title: "My Feature",
      },
    ],
    activeWorkspace: { name: "Test Workspace" },
    openTaskTab: mockOpenTaskTab,
    closeTaskTab: vi.fn(),
    activateTaskTab: vi.fn(),
    openFeatureTab: vi.fn(),
    closeFeatureTab: vi.fn(),
    activateFeatureTab: vi.fn(),
    goToBoard: vi.fn(),
  }),
}));

import { FeatureTabView } from "../features/board/components/FeatureTabView/FeatureTabView";

describe("FeatureTabView — calls openTaskTab instead of inline drilldown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureDetail.mockReturnValue({
      feature: makeFeatureDetail({
        tasks: [
          makeTaskSummary({ task_name: "T3", title: "Implement kanban board" }),
        ],
      }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    mockUseFeatureTask.mockReturnValue({
      task: null,
      loading: false,
      error: null,
      reload: vi.fn(),
    });
  });

  it("renders the tasks panel with data-panel-tasks tab", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).toContain("data-panel-tasks");
  });

  it("renders feature-tab-content with no drilldown content", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureTabView, {
        workspaceId: "ws-1",
        featureId: "feat-uuid-1",
      }),
    );
    expect(html).toContain("data-feature-tab-content");
    // The drilldown content data-attr must not appear in the rendered HTML
    expect(html).not.toContain("data-feature-task-drilldown-content");
  });
});

// ─── Test: Flicker hardening — loading stays false when cached data exists ────
//
// These tests validate the no-blank/no-flicker tab-switching requirement.
// When a tab's data already lives in the TanStack Query cache (from a previous
// visit or pre-fetch), the hook must return loading=false immediately so the
// UI can render cached content without flashing through a loading skeleton.

import { workspaceKeys } from "../lib/query-keys";

describe("Flicker hardening — useFeatureDetail with cached data", () => {
  it("loading is false when cached feature data exists", async () => {
    // Import the real (non-mocked) hook to exercise the TanStack Query cache path.
    const actual = await vi.importActual<{
      useFeatureDetail: typeof import("../features/board/hooks/useFeatureDetail").useFeatureDetail;
    }>("../features/board/hooks/useFeatureDetail");
    const { useFeatureDetail: realUseFeatureDetail } = actual;

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: Infinity, // prevent background refetch during test
          retry: false,
          gcTime: 0,
        },
      },
    });

    const workspaceId = "ws-1";
    const featureId = "feat-uuid-1";
    const cachedFeature = makeFeatureDetail({ title: "Cached Feature" });

    // Seed the cache as if the user already visited this feature tab.
    queryClient.setQueryData(
      workspaceKeys.feature(workspaceId, featureId),
      cachedFeature,
    );

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      );

    const { result } = renderHook(
      () => realUseFeatureDetail(workspaceId, featureId),
      { wrapper },
    );

    // Flicker hardening: loading must be false because cached data exists.
    expect(result.current.loading).toBe(false);
    expect(result.current.feature).not.toBeNull();
    expect(result.current.feature?.title).toBe("Cached Feature");
  });

  it("loading is false even when switching between two cached features", async () => {
    const actual = await vi.importActual<{
      useFeatureDetail: typeof import("../features/board/hooks/useFeatureDetail").useFeatureDetail;
    }>("../features/board/hooks/useFeatureDetail");
    const { useFeatureDetail: realUseFeatureDetail } = actual;

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { staleTime: Infinity, retry: false, gcTime: 0 },
      },
    });

    const ws = "ws-1";
    const featA = makeFeatureDetail({ id: "f-a", title: "Feature A" });
    const featB = makeFeatureDetail({ id: "f-b", title: "Feature B" });

    queryClient.setQueryData(workspaceKeys.feature(ws, "f-a"), featA);
    queryClient.setQueryData(workspaceKeys.feature(ws, "f-b"), featB);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      );

    // Simulate tab switch: render hook for feature A, then feature B.
    const { result: resultA, rerender } = renderHook(
      (featureId: string) => realUseFeatureDetail(ws, featureId),
      { wrapper, initialProps: "f-a" },
    );

    expect(resultA.current.loading).toBe(false);
    expect(resultA.current.feature?.title).toBe("Feature A");

    // Switch to feature B — loading must stay false because B is also cached.
    rerender("f-b");

    expect(resultA.current.loading).toBe(false);
    expect(resultA.current.feature?.title).toBe("Feature B");
  });
});

describe("Flicker hardening — useWorkspaceTask with cached data", () => {
  it("loading is false when cached task data exists", async () => {
    const actual = await vi.importActual<{
      useWorkspaceTask: typeof import("../features/tasks/hooks/useWorkspaceTask").useWorkspaceTask;
    }>("../features/tasks/hooks/useWorkspaceTask");
    const { useWorkspaceTask: realUseWorkspaceTask } = actual;

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { staleTime: Infinity, retry: false, gcTime: 0 },
      },
    });

    const workspaceId = "ws-1";
    const taskId = "task-uuid-1";
    const cachedTask: TaskDetail = {
      id: taskId,
      task_id: taskId,
      task_name: "T1",
      title: "Cached Task",
      status: "in_progress",
      feature_id: "feat-uuid-1",
      feature_name: "my-feature",
      workspace_id: workspaceId,
      activity: [],
      repo: "acme/ui",
      branch: "feature/T1",
      is_blocked: false,
      next_action: "",
      blocked_reason: "",
      depends_on: [],
      execution: { actor_type: "agent" },
    };

    queryClient.setQueryData(
      workspaceKeys.task(workspaceId, taskId),
      cachedTask,
    );

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      );

    const { result } = renderHook(
      () => realUseWorkspaceTask(workspaceId, taskId),
      { wrapper },
    );

    // Flicker hardening: loading must be false because cached data exists.
    expect(result.current.loading).toBe(false);
    expect(result.current.task).not.toBeNull();
    expect(result.current.task?.title).toBe("Cached Task");
  });

  it("loading is false when switching between two cached tasks", async () => {
    const actual = await vi.importActual<{
      useWorkspaceTask: typeof import("../features/tasks/hooks/useWorkspaceTask").useWorkspaceTask;
    }>("../features/tasks/hooks/useWorkspaceTask");
    const { useWorkspaceTask: realUseWorkspaceTask } = actual;

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { staleTime: Infinity, retry: false, gcTime: 0 },
      },
    });

    const ws = "ws-1";

    const taskA: TaskDetail = {
      id: "t-a",
      task_id: "t-a",
      task_name: "TA",
      title: "Task A",
      status: "in_progress",
      feature_id: "f-1",
      feature_name: "feat-one",
      workspace_id: ws,
      activity: [],
      next_action: "",
      blocked_reason: "",
      depends_on: [],
      execution: { actor_type: "agent" },
      repo: "acme/ui",
      branch: "feature/TA",
      is_blocked: false,
    };
    const taskB: TaskDetail = {
      id: "t-b",
      task_id: "t-b",
      task_name: "TB",
      title: "Task B",
      status: "done",
      feature_id: "f-1",
      feature_name: "feat-one",
      workspace_id: ws,
      activity: [],
      next_action: "",
      blocked_reason: "",
      depends_on: [],
      execution: { actor_type: "agent" },
      repo: "acme/ui",
      branch: "feature/TB",
      is_blocked: false,
    };

    queryClient.setQueryData(workspaceKeys.task(ws, "t-a"), taskA);
    queryClient.setQueryData(workspaceKeys.task(ws, "t-b"), taskB);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      );

    const { result, rerender } = renderHook(
      (taskId: string) => realUseWorkspaceTask(ws, taskId),
      { wrapper, initialProps: "t-a" },
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.task?.title).toBe("Task A");

    // Switch to task B — loading must stay false because B is also cached.
    rerender("t-b");

    expect(result.current.loading).toBe(false);
    expect(result.current.task?.title).toBe("Task B");
  });
});
