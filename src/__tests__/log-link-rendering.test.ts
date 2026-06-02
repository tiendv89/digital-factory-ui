/**
 * Tests for T5 log link rendering deliverables:
 *   - FeatureLogsPanel renders HTTP/HTTPS URLs as clickable links
 *   - TaskTabView activity timeline renders HTTP/HTTPS URLs as clickable links
 *   - Plain text notes render unchanged
 *   - Malformed URL-like text degrades to plain text
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ActivityEvent, TaskDetail } from "../services/workflow-backend/types";

// ─── Mock hooks ───────────────────────────────────────────────────────────────

const mockUseFeatureDetail = vi.hoisted(() => vi.fn());
const mockUseFeatureTask = vi.hoisted(() => vi.fn());

vi.mock("../features/board/hooks/useFeatureDetail", () => ({
  useFeatureDetail: mockUseFeatureDetail,
  useFeatureTask: mockUseFeatureTask,
}));

vi.mock("../features/workspaces/context/WorkspaceContext", () => ({
  useWorkspaceContext: () => ({
    activeSurface: "board",
    activeTaskTabId: null,
    activeFeatureTabId: null,
    openTaskTabs: [],
    openFeatureTabs: [],
    activeWorkspace: null,
    openTaskTab: vi.fn(),
    closeTaskTab: vi.fn(),
    activateTaskTab: vi.fn(),
    openFeatureTab: vi.fn(),
    closeFeatureTab: vi.fn(),
    activateFeatureTab: vi.fn(),
    goToBoard: vi.fn(),
    selectedWorkspaceId: "ws-uuid-1",
  }),
}));

// ─── Mock hook for TaskTabView ────────────────────────────────────────────────

const mockUseWorkspaceTask = vi.hoisted(() => vi.fn());

vi.mock("../features/tasks/hooks/useWorkspaceTask", () => ({
  useWorkspaceTask: mockUseWorkspaceTask,
}));

import { FeatureLogsPanel } from "../features/board/components/FeatureTabView/FeatureLogsPanel";
import { TaskTabView } from "../features/tasks/components/TaskTabView/TaskTabView";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeActivityEvent(note: string): ActivityEvent {
  return {
    action: "approved",
    scope: "tasks",
    actor: "test@example.com",
    occurred_at: "2026-05-09T13:02:00Z",
    note,
    feature_id: "feat-uuid-1",
  };
}

function makeTaskDetailWithActivityNote(note: string): TaskDetail {
  return {
    id: "task-uuid-1",
    task_id: "task-uuid-1",
    task_name: "T5",
    feature_id: "feat-uuid-1",
    feature_name: "test-feature",
    title: "Test Task",
    status: "in_review",
    repo: "acme/api-service",
    branch: "feature/test-T5",
    is_blocked: false,
    pr: null,
    workspace_pr: null,
    next_action: "",
    blocked_reason: "",
    workspace_id: "ws-uuid-1",
    depends_on: [],
    execution: { actor_type: "agent", last_updated_by: "test@example.com" },
    pr_refs: [],
    activity: [
      {
        action: "in_review",
        scope: "task",
        actor: "test@example.com",
        occurred_at: "2026-05-09T13:02:00Z",
        note,
      },
    ],
  };
}

// ─── FeatureLogsPanel — link rendering ───────────────────────────────────────

describe("FeatureLogsPanel — log note link rendering", () => {
  it("renders HTTP/HTTPS URL in note as a clickable link with data-activity-feed-link", () => {
    const note = "PR merged at https://github.com/org/repo/pull/42 done";
    const html = renderToStaticMarkup(
      React.createElement(FeatureLogsPanel, {
        events: [makeActivityEvent(note)],
      }),
    );

    expect(html).toContain("data-activity-feed-link");
    expect(html).toContain('href="https://github.com/org/repo/pull/42"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("renders surrounding text alongside the link", () => {
    const note = "See https://example.com for details";
    const html = renderToStaticMarkup(
      React.createElement(FeatureLogsPanel, {
        events: [makeActivityEvent(note)],
      }),
    );

    expect(html).toContain("See");
    expect(html).toContain("for details");
    expect(html).toContain('href="https://example.com"');
  });

  it("renders plain note text without link markup when no URL is present", () => {
    const note = "Tasks approved with no links here.";
    const html = renderToStaticMarkup(
      React.createElement(FeatureLogsPanel, {
        events: [makeActivityEvent(note)],
      }),
    );

    expect(html).toContain("Tasks approved with no links here.");
    expect(html).not.toContain("data-activity-feed-link");
    expect(html).not.toContain("<a ");
  });

  it("degrades malformed URL-like text to plain text without crashing", () => {
    expect(() =>
      renderToStaticMarkup(
        React.createElement(FeatureLogsPanel, {
          events: [makeActivityEvent("Invalid url: https:// and https://not-a-valid-url")],
        }),
      ),
    ).not.toThrow();

    const html = renderToStaticMarkup(
      React.createElement(FeatureLogsPanel, {
        events: [makeActivityEvent("Invalid url: https://")],
      }),
    );
    expect(html).toContain("https://");
    expect(html).not.toContain("data-activity-feed-link");
  });

  it("renders multiple URLs in one note as separate links", () => {
    const note = "PR1 https://github.com/org/repo/pull/1 and PR2 https://github.com/org/repo/pull/2";
    const html = renderToStaticMarkup(
      React.createElement(FeatureLogsPanel, {
        events: [makeActivityEvent(note)],
      }),
    );

    const linkCount = (html.match(/data-activity-feed-link/g) ?? []).length;
    expect(linkCount).toBe(2);
    expect(html).toContain('href="https://github.com/org/repo/pull/1"');
    expect(html).toContain('href="https://github.com/org/repo/pull/2"');
  });
});

// ─── TaskTabView — activity note link rendering ───────────────────────────────

describe("TaskTabView — activity note link rendering", () => {
  beforeEach(() => {
    mockUseWorkspaceTask.mockReset();
  });

  it("renders HTTP/HTTPS URL in activity note as a clickable link with data-task-activity-link", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTaskDetailWithActivityNote(
        "PR merged at https://github.com/org/repo/pull/42 done",
      ),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );

    expect(html).toContain("data-task-activity-link");
    expect(html).toContain('href="https://github.com/org/repo/pull/42"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("renders surrounding text alongside the link in activity note", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTaskDetailWithActivityNote("Check https://example.com for context"),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );

    expect(html).toContain("Check");
    expect(html).toContain("for context");
    expect(html).toContain('href="https://example.com"');
  });

  it("renders plain activity note text without link markup when no URL is present", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTaskDetailWithActivityNote("Task completed without any links"),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );

    expect(html).toContain("Task completed without any links");
    expect(html).not.toContain("data-task-activity-link");
  });

  it("degrades malformed URL-like text to plain text without crashing", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTaskDetailWithActivityNote("Invalid url: https://"),
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    expect(() =>
      renderToStaticMarkup(
        React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
      ),
    ).not.toThrow();

    const html = renderToStaticMarkup(
      React.createElement(TaskTabView, { workspaceId: "ws-1", taskId: "task-uuid-1" }),
    );
    expect(html).toContain("https://");
    expect(html).not.toContain("data-task-activity-link");
  });
});
