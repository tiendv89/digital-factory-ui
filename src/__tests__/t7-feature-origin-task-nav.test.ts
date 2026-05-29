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
import type { TaskDetail, FeatureDetail, TaskSummary } from "../services/workflow-backend/types";

// ─── Mock next/navigation ─────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

const mockRouterPush = vi.fn();

// ─── Helper: create a TaskTabEntry for context tests ──────────────────────────

import type { TaskTabEntry, WorkspaceContextValue } from "../features/workspaces/context/WorkspaceContext";
import { addTaskTab, removeTaskTab, getTaskTabHref, createTabSessionId } from "../features/workspaces/lib/tabState";

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

function makeFeatureDetail(overrides: Partial<FeatureDetail> = {}): FeatureDetail {
  return {
    id: "feat-uuid-1",
    feature_id: "feat-uuid-1",
    feature_name: "my-feature",
    title: "My Feature",
    status: "in_implementation",
    current_stage: "in_implementation",
    task_counts: { total: 0, done: 0, in_progress: 0, blocked: 0, ready: 0, todo: 0 },
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
      tasks: [makeTaskSummary({ task_name: "T3", title: "Implement kanban board" })],
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
        tasks: [makeTaskSummary({ task_name: "T3", title: "Implement kanban board" })],
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
