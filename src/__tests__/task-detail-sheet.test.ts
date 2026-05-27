import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedTask } from "../services/yaml-parser";
import type { TaskDetail } from "../services/workflow-backend/types";
import { TaskDetailSheet } from "../features/tasks/components/TaskDetailSheet/TaskDetailSheet";
import { TaskDetailSheetMount } from "../features/tasks/components/TaskDetailSheet/TaskDetailSheetMount";

const mockUseFeatureTask = vi.hoisted(() => vi.fn());

const mockBoardContext = vi.hoisted(() => ({
  selectedTask: null as unknown,
  setSelectedTask: vi.fn(),
  workspaceDetail: {
    id: "ws-1",
    name: "digital-factory-ui",
    slug: "digital-factory-ui",
    repo_url: "https://github.com/tiendv89/digital-factory-ui",
    source_state: { stale: false },
    updated_at: "2026-01-01T00:00:00Z",
    features: [],
    tasks: [],
  },
}));

vi.mock("@/features/board/components/KanbanBoard/KanbanBoard.context", () => ({
  useBoardContext: () => mockBoardContext,
}));

vi.mock("@/features/board/hooks/useFeatureDetail", () => ({
  useFeatureTask: mockUseFeatureTask,
}));

const task: ParsedTask = {
  id: "T5",
  title: "Inspect task details",
  status: "in_review",
  dependsOn: ["T1", "T2"],
  backendId: "task-uuid-5",
  featureBackendId: "feat-uuid-5",
  execution: {
    actor_type: "agent",
    last_updated_at: "2026-05-07T10:15:00Z",
  },
  branch: "feature/dashboard-T5",
  pr: {
    status: "closed",
    url: "https://example.com/repo/pr/5",
  },
  workspace_pr: {
    status: "open",
    url: "https://example.com/workspace/pr/5",
  },
  blockedReason: "Waiting for QA",
  blockedContext: {
    reason: "qa_pending",
  },
  log: [
    {
      action: "in_progress",
      by: "alice",
      at: "2026-05-07T09:00:00Z",
    },
    {
      action: "in_review",
      by: "bob",
      at: "2026-05-07T10:00:00Z",
      note: "Ready for review",
    },
  ],
};

const taskWithWorkspacePrOnly: ParsedTask = {
  ...task,
  pr: undefined,
};

beforeEach(() => {
  mockBoardContext.selectedTask = {
    task,
    featureId: "dashboard",
    featureTitle: "Dashboard",
  };
  mockBoardContext.setSelectedTask.mockReset();
  mockUseFeatureTask.mockReset();
  mockUseFeatureTask.mockReturnValue({
    task: null,
    loading: false,
    error: null,
    reload: vi.fn(),
  });
});

describe("TaskDetailSheet", () => {
  it("renders task detail content", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskDetailSheet, {
        task,
        featureTitle: "Dashboard",
        repository: "tiendv89/digital-factory-ui",
        nextAction: "Human approves or rejects",
        onClose: () => undefined,
      }),
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain("T5");
    expect(html).toContain("Inspect task details");
    expect(html).toContain("Dashboard");
    expect(html).toContain("tiendv89/digital-factory-ui");
    expect(html).toContain("https://github.com/tiendv89/digital-factory-ui");
    expect(html).toContain("feature/dashboard-T5");
    expect(html).toContain("Human approves or rejects");
    expect(html).toContain("T1");
    expect(html).toContain("T2");
    expect(html).toContain("Waiting for QA");
    expect(html).toContain("qa_pending");
    expect(html).toContain("https://example.com/workspace/pr/5");
    expect(html).toContain("https://example.com/repo/pr/5");
    expect(html).toContain("alice");
    expect(html).toContain("bob");
    expect(html).toContain("Ready for review");
    expect(html.match(/data-task-timeline-entry/g) ?? []).toHaveLength(2);
    expect(html).toContain('data-task-timeline-status="in_progress"');
    expect(html).toContain('data-task-timeline-status="in_review"');
    expect(html).toContain("bg-warning-bg");
    expect(html).toContain("bg-purple-bg");
    expect(html).toContain("border border-border");
  });

  it("renders activity timeline newest first", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskDetailSheet, {
        task,
        featureTitle: "Dashboard",
        repository: "tiendv89/digital-factory-ui",
        nextAction: "Human approves or rejects",
        onClose: () => undefined,
      }),
    );

    const newerStatusIndex = html.indexOf(
      'data-task-timeline-status="in_review"',
    );
    const olderStatusIndex = html.indexOf(
      'data-task-timeline-status="in_progress"',
    );
    expect(newerStatusIndex).toBeGreaterThan(-1);
    expect(olderStatusIndex).toBeGreaterThan(-1);
    expect(newerStatusIndex).toBeLessThan(olderStatusIndex);
  });

  it("uses the workspace PR as a clickable repository PR fallback when needed", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskDetailSheet, {
        task: taskWithWorkspacePrOnly,
        featureTitle: "Dashboard",
        repository: "tiendv89/digital-factory-ui",
        nextAction: "Human approves or rejects",
        onClose: () => undefined,
      }),
    );

    expect(html).toContain("Repository PR");
    expect(html).toContain("https://example.com/workspace/pr/5");
    expect(html).not.toContain("https://example.com/repo/pr/5");
  });

  it("renders URLs in log notes as clickable links with data-timeline-link attribute", () => {
    const taskWithUrlNote: ParsedTask = {
      ...task,
      log: [
        {
          action: "in_review",
          by: "alice",
          at: "2026-05-07T10:00:00Z",
          note: "PR merged at https://github.com/tiendv89/digital-factory-ui/pull/57 done",
        },
      ],
    };
    const html = renderToStaticMarkup(
      React.createElement(TaskDetailSheet, {
        task: taskWithUrlNote,
        featureTitle: "Dashboard",
        repository: "tiendv89/digital-factory-ui",
        nextAction: "Human approves or rejects",
        onClose: () => undefined,
      }),
    );

    expect(html).toContain("data-timeline-link");
    expect(html).toContain('href="https://github.com/tiendv89/digital-factory-ui/pull/57"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("renders plain note text without link markup when no URL is present", () => {
    const taskWithPlainNote: ParsedTask = {
      ...task,
      log: [
        {
          action: "done",
          by: "bob",
          at: "2026-05-07T11:00:00Z",
          note: "Task completed without any links",
        },
      ],
    };
    const html = renderToStaticMarkup(
      React.createElement(TaskDetailSheet, {
        task: taskWithPlainNote,
        featureTitle: "Dashboard",
        repository: "tiendv89/digital-factory-ui",
        nextAction: "Human approves or rejects",
        onClose: () => undefined,
      }),
    );

    expect(html).toContain("Task completed without any links");
    expect(html).not.toContain("data-timeline-link");
  });
});

describe("TaskDetailSheetMount", () => {
  it("derives repository and next action from board context", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskDetailSheetMount),
    );

    expect(html).toContain("tiendv89/digital-factory-ui");
    expect(html).toContain("https://github.com/tiendv89/digital-factory-ui");
    expect(html).toContain("Human approves or rejects");
    expect(html).toContain("Dashboard");
    expect(html).toContain("https://example.com/workspace/pr/5");
    expect(mockBoardContext.setSelectedTask).not.toHaveBeenCalled();
  });

  it("requests feature-scoped task detail from the backend by workspace, feature, and task ids", () => {
    renderToStaticMarkup(React.createElement(TaskDetailSheetMount));

    expect(mockUseFeatureTask).toHaveBeenCalledWith(
      "ws-1",
      "feat-uuid-5",
      "task-uuid-5",
    );
  });

  it("renders backend task detail when the detail request resolves", () => {
    const backendTask: TaskDetail = {
      id: "task-uuid-5",
      task_id: "task-uuid-5",
      task_name: "T5",
      feature_id: "feat-uuid-5",
      feature_name: "Backend Feature",
      title: "Backend Task Detail",
      status: "ready",
      repo: "tiendv89/digital-factory-ui",
      branch: "feature/backend-task-detail-T5",
      is_blocked: false,
      pr: null,
      workspace_pr: null,
      next_action: "Backend next action",
      blocked_reason: "",
      workspace_id: "ws-1",
      depends_on: ["T9"],
      execution: {
        actor_type: "agent",
        last_updated_at: "2026-05-20T10:00:00Z",
      },
      pr_refs: [],
      activity: [
        {
          action: "done",
          scope: "task",
          actor: "human@example.com",
          occurred_at: "2026-05-20T12:00:00Z",
          note: "Task approved from backend activity",
          feature_id: "feat-uuid-5",
          task_id: "task-uuid-5",
        },
        {
          action: "started",
          scope: "task",
          actor: "agent@example.com",
          occurred_at: "2026-05-20T10:30:00Z",
          note: "Started from backend activity",
          feature_id: "feat-uuid-5",
          task_id: "task-uuid-5",
        },
      ],
    };
    mockUseFeatureTask.mockReturnValue({
      task: backendTask,
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(TaskDetailSheetMount),
    );

    expect(html).toContain("Backend Task Detail");
    expect(html).toContain("Backend Feature");
    expect(html).toContain("Backend next action");
    expect(html).toContain("T9");
    expect(html.match(/data-task-timeline-entry/g) ?? []).toHaveLength(2);
    expect(html).toContain("Task approved from backend activity");
    expect(html).toContain("Started from backend activity");
    expect(html).toContain("by human@example.com");

    const newerActivityIndex = html.indexOf("Task approved from backend activity");
    const olderActivityIndex = html.indexOf("Started from backend activity");
    expect(newerActivityIndex).toBeGreaterThan(-1);
    expect(olderActivityIndex).toBeGreaterThan(-1);
    expect(newerActivityIndex).toBeLessThan(olderActivityIndex);
  });
});
