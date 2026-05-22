/**
 * Tests for T4 task tab deliverables:
 *   - Task tab loading, error, and content rendering
 *   - Metadata fallbacks (title, repo, branch, blocked_reason, execution, depends_on, pr_refs)
 *   - Back-to-board button and copy-id affordance
 *   - TaskCard / TaskTrackingItem click behavior wiring
 *   - WorkspaceTabBar tab rendering
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskDetail, PullRequestRef } from "../services/workflow-backend/types";

// ─── Mock useWorkspaceTask ─────────────────────────────────────────────────────

const mockUseWorkspaceTask = vi.hoisted(() => vi.fn());

vi.mock("../features/tasks/hooks/useWorkspaceTask", () => ({
  useWorkspaceTask: mockUseWorkspaceTask,
}));

// ─── Mock useWorkspaceContext ──────────────────────────────────────────────────

const mockWorkspaceContext = vi.hoisted(() => ({
  activeSurface: "board" as string,
  activeTaskTabId: null as string | null,
  activeFeatureTabId: null as string | null,
  openTaskTabs: [] as Array<{
    sessionId: string;
    workspaceId: string;
    taskId: string;
    taskName: string;
    title: string;
  }>,
  openFeatureTabs: [] as Array<{
    sessionId: string;
    workspaceId: string;
    featureId: string;
    featureName: string;
    title: string;
  }>,
  activeWorkspace: null as { name?: string; slug?: string } | null,
  openTaskTab: vi.fn(),
  closeTaskTab: vi.fn(),
  activateTaskTab: vi.fn(),
  openFeatureTab: vi.fn(),
  closeFeatureTab: vi.fn(),
  activateFeatureTab: vi.fn(),
  goToBoard: vi.fn(),
}));

vi.mock("../features/workspaces/context/WorkspaceContext", () => ({
  useWorkspaceContext: () => mockWorkspaceContext,
}));

import { TaskTabView } from "../features/tasks/components/TaskTabView/TaskTabView";
import { WorkspaceTabBar } from "../features/workspaces/components/WorkspaceTabBar/WorkspaceTabBar";
import { TaskCard } from "../features/board/components/TaskCard/TaskCard";
import { TaskTrackingItem } from "../features/board/components/TaskTrackingPanel/TaskTrackingItem";
import type { ParsedTask, ParsedFeature } from "../services/yaml-parser";

// ─── Test fixtures ────────────────────────────────────────────────────────────

function makeTaskDetail(overrides: Partial<TaskDetail> = {}): TaskDetail {
  return {
    id: "task-uuid-1",
    task_id: "task-uuid-1",
    task_name: "T5",
    feature_id: "feat-uuid-1",
    feature_name: "my-feature",
    title: "Inspect task details",
    status: "in_review",
    repo: "acme/api-service",
    branch: "feature/my-feature-T5",
    is_blocked: false,
    pr: null,
    workspace_pr: null,
    next_action: "Human approves or rejects",
    blocked_reason: "",
    workspace_id: "ws-uuid-1",
    depends_on: ["T3", "T4"],
    execution: {
      actor_type: "agent",
      last_updated_by: "alice@example.com",
      last_updated_at: "2026-05-07T10:15:00Z",
    },
    pr_refs: [
      {
        label: "Workspace PR",
        status: "open",
        repo: "acme/project-workspace",
        url: "https://github.com/acme/project-workspace/pull/42",
      },
    ],
    ...overrides,
  };
}

function makeParsedTask(overrides: Partial<ParsedTask> = {}): ParsedTask {
  return {
    id: "T5",
    title: "Some task title",
    status: "in_progress",
    dependsOn: [],
    backendId: "task-uuid-1",
    ...overrides,
  };
}

function makeFeature(overrides: Partial<ParsedFeature> = {}): ParsedFeature {
  return {
    id: "auth",
    title: "Authentication",
    featureStatus: "in_implementation",
    tasks: [],
    ...overrides,
  };
}

// ─── TaskTabView — loading state ──────────────────────────────────────────────

describe("TaskTabView — loading state", () => {
  beforeEach(() => {
    mockUseWorkspaceTask.mockReturnValue({
      task: null,
      loading: true,
      error: null,
      reload: vi.fn(),
    });
  });

  it("renders data-task-tab-loading indicator", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "t-1" }),
    );
    expect(html).toContain("data-task-tab-loading");
    expect(html).toContain("Loading task");
  });

  it("does not render task content while loading", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "t-1" }),
    );
    expect(html).not.toContain("data-task-tab-content");
    expect(html).not.toContain("data-task-tab-error");
  });
});

// ─── TaskTabView — error state ────────────────────────────────────────────────

describe("TaskTabView — error state", () => {
  it("renders data-task-tab-error with error message", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: null,
      loading: false,
      error: { code: "DATABASE_NOT_FOUND", message: "Task not found.", retryable: false },
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "t-1" }),
    );
    expect(html).toContain("data-task-tab-error");
    expect(html).toContain("Task not found.");
  });

  it("renders retry button when error is retryable", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: null,
      loading: false,
      error: { code: "ADAPTER_TIMEOUT", message: "Timeout.", retryable: true },
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "t-1" }),
    );
    expect(html).toContain("Retry");
  });

  it("does not render retry button when error is not retryable", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: null,
      loading: false,
      error: { code: "DATABASE_NOT_FOUND", message: "Not found.", retryable: false },
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "t-1" }),
    );
    expect(html).not.toContain("Retry");
  });
});

// ─── TaskTabView — content rendering ─────────────────────────────────────────

describe("TaskTabView — content rendering", () => {
  beforeEach(() => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTaskDetail(),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
  });

  it("renders data-task-tab-content with task name badge", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );
    expect(html).toContain("data-task-tab-content");
    expect(html).toContain("T5");
  });

  it("renders task detail without an agent chat placeholder", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );

    expect(html).toContain("data-task-tab-content");
    expect(html).not.toContain("data-detail-split-layout");
    expect(html).not.toContain("data-detail-section-one");
    expect(html).not.toContain("data-agent-chat-placeholder");
  });

  it("renders task title in header", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );
    expect(html).toContain("Inspect task details");
  });

  it("renders back-to-board button with data-back-to-board", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );
    expect(html).toContain("data-back-to-board");
    expect(html).toContain("Back");
  });

  it("renders copy-id button with data-copy-task-id", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );
    expect(html).toContain("data-copy-task-id");
  });

  it("renders status badge", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );
    expect(html).toContain("IN REVIEW");
    expect(html).toContain("#8e67cb");
  });

  it("renders repo link in metadata", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );
    expect(html).toContain("acme/api-service");
  });

  it("renders branch in metadata", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );
    expect(html).toContain("feature/my-feature-T5");
  });

  it("renders dependencies section when depends_on is non-empty", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );
    expect(html).toContain("data-task-depends-on");
    expect(html).toContain("T3");
    expect(html).toContain("T4");
  });

  it("renders execution section when execution is present", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );
    expect(html).toContain("data-task-execution");
    expect(html).toContain("alice@example.com");
    expect(html).toContain("agent");
  });

  it("renders PR refs section when pr_refs is non-empty", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );
    expect(html).toContain("data-task-pr-refs");
    expect(html).toContain("https://github.com/acme/project-workspace/pull/42");
    expect(html).toContain("Workspace PR");

    const prCardStart = html.indexOf(
      'data-pr-ref="https://github.com/acme/project-workspace/pull/42"',
    );
    const prCard = html.slice(prCardStart, html.indexOf("</a>", prCardStart));
    expect(prCard).not.toContain(">open<");
  });
});

// ─── TaskTabView — metadata fallbacks ────────────────────────────────────────

describe("TaskTabView — metadata fallbacks", () => {
  it("falls back to task_name when title is empty", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTaskDetail({ title: "" }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );
    // task_name "T5" should appear in header as fallback
    expect(html).toContain("T5");
  });

  it("shows None when repo is empty", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTaskDetail({ repo: "" }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );
    expect(html).toContain("None");
  });

  it("shows None when branch is empty", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTaskDetail({ branch: "" }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );
    expect(html).toContain("None");
  });

  it("does not render dependencies section when depends_on is empty", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTaskDetail({ depends_on: [] }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );
    expect(html).not.toContain("data-task-depends-on");
  });

  it("does not render execution section when execution is absent", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTaskDetail({ execution: undefined as unknown as TaskDetail["execution"] }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );
    expect(html).not.toContain("data-task-execution");
  });

  it("does not render PR refs section when pr_refs is empty and no legacy PR", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTaskDetail({ pr_refs: [], pr: null, workspace_pr: null }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );
    expect(html).not.toContain("data-task-pr-refs");
  });

  it("renders blocked reason when present", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTaskDetail({ blocked_reason: "Waiting on T3 completion" }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );
    expect(html).toContain("data-blocked-reason");
    expect(html).toContain("Waiting on T3 completion");
  });

  it("merges legacy pr into pr_refs when url differs from existing refs", () => {
    const legacyPr: PullRequestRef = {
      label: "Repository PR",
      status: "open",
      repo: "acme/api-service",
      url: "https://github.com/acme/api-service/pull/10",
    };

    mockUseWorkspaceTask.mockReturnValue({
      task: makeTaskDetail({ pr_refs: [], pr: legacyPr }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );
    expect(html).toContain("https://github.com/acme/api-service/pull/10");
  });
});

// ─── WorkspaceTabBar — rendering ──────────────────────────────────────────────

describe("WorkspaceTabBar", () => {
  it("renders the workspace tab with data-workspace-tab", () => {
    mockWorkspaceContext.openTaskTabs = [];
    mockWorkspaceContext.activeSurface = "board";
    mockWorkspaceContext.activeWorkspace = { name: "My Workspace" };

    const html = renderToStaticMarkup(React.createElement(WorkspaceTabBar));
    expect(html).toContain("data-workspace-tab");
    expect(html).toContain("My Workspace");
  });

  it("renders task tabs for each open task tab", () => {
    mockWorkspaceContext.openTaskTabs = [
      {
        sessionId: "task-session-t5",
        workspaceId: "ws-1",
        taskId: "uuid-t5",
        taskName: "T5",
        title: "Inspect task details",
      },
      {
        sessionId: "task-session-t6",
        workspaceId: "ws-1",
        taskId: "uuid-t6",
        taskName: "T6",
        title: "Document rendering",
      },
    ];
    mockWorkspaceContext.activeSurface = "task-tab";
    mockWorkspaceContext.activeTaskTabId = "task-session-t5";

    const html = renderToStaticMarkup(React.createElement(WorkspaceTabBar));
    expect(html).toContain('data-task-tab="task-session-t5"');
    expect(html).toContain('data-task-tab="task-session-t6"');
    expect(html).toContain("T5");
    expect(html).toContain("T6");
    expect(html).toContain("Inspect task details");
    expect(html).toContain("Document rendering");
  });

  it("marks active task tab with aria-selected=true", () => {
    mockWorkspaceContext.openTaskTabs = [
      {
        sessionId: "task-session-t5",
        workspaceId: "ws-1",
        taskId: "uuid-t5",
        taskName: "T5",
        title: "Some task",
      },
    ];
    mockWorkspaceContext.activeSurface = "task-tab";
    mockWorkspaceContext.activeTaskTabId = "task-session-t5";

    const html = renderToStaticMarkup(React.createElement(WorkspaceTabBar));
    expect(html).toContain('aria-selected="true"');
  });

  it("marks inactive task tab with aria-selected=false", () => {
    mockWorkspaceContext.openTaskTabs = [
      {
        sessionId: "task-session-t5",
        workspaceId: "ws-1",
        taskId: "uuid-t5",
        taskName: "T5",
        title: "Some task",
      },
    ];
    mockWorkspaceContext.activeSurface = "board";
    mockWorkspaceContext.activeTaskTabId = null;

    const html = renderToStaticMarkup(React.createElement(WorkspaceTabBar));
    expect(html).toContain('aria-selected="false"');
  });

  it("renders close button for each task tab", () => {
    mockWorkspaceContext.openTaskTabs = [
      {
        sessionId: "task-session-t5",
        workspaceId: "ws-1",
        taskId: "uuid-t5",
        taskName: "T5",
        title: "Some task",
      },
    ];

    const html = renderToStaticMarkup(React.createElement(WorkspaceTabBar));
    expect(html).toContain("Close T5 tab");
  });

  it("renders no task tabs when openTaskTabs is empty", () => {
    mockWorkspaceContext.openTaskTabs = [];
    mockWorkspaceContext.activeSurface = "board";

    const html = renderToStaticMarkup(React.createElement(WorkspaceTabBar));
    // only workspace tab present
    expect(html).toContain("data-workspace-tab");
    expect(html).not.toContain("data-task-tab=");
  });
});

// ─── TaskCard — click behavior wiring ────────────────────────────────────────

describe("TaskCard — click behavior", () => {
  const task = makeParsedTask({ id: "T7", title: "OAuth token refresh", status: "ready" });
  const onSelect = vi.fn();
  const onOpenTab = vi.fn();

  beforeEach(() => {
    onSelect.mockClear();
    onOpenTab.mockClear();
  });

  it("renders with data-task-id attribute", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskCard, {
        task,
        featureId: "auth",
        featureTitle: "Authentication",
        onSelect,
        onOpenTab,
      }),
    );
    expect(html).toContain('data-task-id="T7"');
  });

  it("renders task title", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskCard, {
        task,
        featureId: "auth",
        featureTitle: "Authentication",
        onSelect,
        onOpenTab,
      }),
    );
    expect(html).toContain("OAuth token refresh");
  });

  it("renders with role=button for keyboard accessibility", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskCard, {
        task,
        featureId: "auth",
        featureTitle: "Authentication",
        onSelect,
        onOpenTab,
      }),
    );
    expect(html).toContain('role="button"');
  });

  it("does not call onSelect or onOpenTab during rendering", () => {
    renderToStaticMarkup(
      React.createElement(TaskCard, {
        task,
        featureId: "auth",
        featureTitle: "Authentication",
        onSelect,
        onOpenTab,
      }),
    );
    expect(onSelect).not.toHaveBeenCalled();
    expect(onOpenTab).not.toHaveBeenCalled();
  });
});

// ─── TaskTrackingItem — click behavior ────────────────────────────────────────

describe("TaskTrackingItem — click behavior", () => {
  const task = makeParsedTask({ id: "T8", title: "JWT verification", status: "in_progress" });
  const feature = makeFeature({ id: "auth", title: "Authentication" });
  const onSelect = vi.fn();
  const onOpenTab = vi.fn();

  beforeEach(() => {
    onSelect.mockClear();
    onOpenTab.mockClear();
  });

  it("renders task id badge", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTrackingItem, {
        task,
        feature,
        onSelect,
        onOpenTab,
      }),
    );
    expect(html).toContain('aria-label="Task T8"');
  });

  it("renders task title", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTrackingItem, {
        task,
        feature,
        onSelect,
        onOpenTab,
      }),
    );
    expect(html).toContain("JWT verification");
  });

  it("renders feature name chip", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTrackingItem, {
        task,
        feature,
        onSelect,
        onOpenTab,
      }),
    );
    expect(html).toContain("Authentication");
  });

  it("does not call onSelect or onOpenTab during rendering", () => {
    renderToStaticMarkup(
      React.createElement(TaskTrackingItem, {
        task,
        feature,
        onSelect,
        onOpenTab,
      }),
    );
    expect(onSelect).not.toHaveBeenCalled();
    expect(onOpenTab).not.toHaveBeenCalled();
  });
});

// ─── Task tab — no sidebar ────────────────────────────────────────────────────

describe("TaskTabView — no board sidebar", () => {
  it("does not render board sidebar markup in task tab content", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTaskDetail(),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );
    // Board sidebar has role="complementary" and aria-label="Tasks sidebar"
    expect(html).not.toContain("Tasks Sidebar");
    expect(html).not.toContain("aria-label=\"Tasks sidebar\"");
  });
});
