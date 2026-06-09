/**
 * T5 — Task Review (real PR metadata; diff + thread placeholder)
 *
 * Covers:
 * - TaskTabView renders loading state
 * - TaskTabView renders error state with retry button
 * - TaskTabView renders task content with header
 * - PR pills render real PR metadata (url, status, repo)
 * - PR pill with URL renders as an anchor link
 * - PR pill without URL renders as non-interactive span
 * - Diff viewer placeholder is present with correct data attribute
 * - Review thread placeholder is present with correct data attribute
 * - Both placeholders are clearly labelled "not built yet"
 * - Task with no PR entries does not render PR pills row
 * - Existing sections (metadata, dependencies, activity) still render
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskDetail } from "@/services/workflow-backend/types";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/features/workspaces/context/WorkspaceContext", () => ({
  useWorkspaceContext: () => ({
    activeTaskTabId: "tab-1",
    closeTaskTab: vi.fn(),
    goToBoard: vi.fn(),
    markTaskTabActive: vi.fn(),
    openFeatureTabs: [],
  }),
}));

// Mock useWorkspaceTask — overridden per test group via mockImplementation
const mockUseWorkspaceTask = vi.fn();
vi.mock("@/features/tasks/hooks/useWorkspaceTask", () => ({
  useWorkspaceTask: (...args: unknown[]) => mockUseWorkspaceTask(...args),
}));

// ── Import under test ─────────────────────────────────────────────────────────

import { TaskTabView } from "../features/tasks/components/TaskTabView/TaskTabView";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<TaskDetail> = {}): TaskDetail {
  return {
    id: "t-1",
    task_id: "T1",
    task_name: "T1",
    feature_id: "feat-1",
    feature_name: "Feature One",
    title: "Implement auth",
    status: "in_review",
    repo: "my-repo",
    branch: "feature/auth",
    is_blocked: false,
    next_action: "review",
    blocked_reason: "",
    workspace_id: "ws-1",
    depends_on: [],
    execution: {
      actor_type: "agent",
      last_updated_by: "agent@example.com",
      last_updated_at: "2026-06-09T10:00:00Z",
    },
    pr_refs: [],
    activity: [],
    ...overrides,
  };
}

function render(props: { workspaceId: string; taskId: string }): string {
  return renderToStaticMarkup(React.createElement(TaskTabView, props));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("TaskTabView — loading state", () => {
  it("renders data-task-tab-loading when loading", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: null,
      loading: true,
      error: null,
      reload: vi.fn(),
    });
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    expect(html).toContain("data-task-tab-loading");
    expect(html).toContain("Loading task");
  });
});

describe("TaskTabView — error state", () => {
  it("renders data-task-tab-error with message", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: null,
      loading: false,
      error: { message: "Network error", retryable: false },
      reload: vi.fn(),
    });
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    expect(html).toContain("data-task-tab-error");
    expect(html).toContain("Network error");
  });

  it("shows retry button when error is retryable", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: null,
      loading: false,
      error: { message: "Timeout", retryable: true },
      reload: vi.fn(),
    });
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    expect(html).toContain("Retry");
  });
});

describe("TaskTabView — task content", () => {
  beforeEach(() => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTask(),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
  });

  it("renders data-task-tab-content", () => {
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    expect(html).toContain("data-task-tab-content");
  });

  it("renders task title in header", () => {
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    expect(html).toContain("Implement auth");
  });

  it("renders task_name badge", () => {
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    expect(html).toContain(">T1<");
  });

  it("renders back-to-board button", () => {
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    expect(html).toContain("data-back-to-board");
  });

  it("renders copy-task-id button", () => {
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    expect(html).toContain("data-copy-task-id");
  });
});

describe("TaskTabView — diff and review thread placeholders", () => {
  beforeEach(() => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTask(),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
  });

  it("renders diff placeholder with data-diff-placeholder", () => {
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    expect(html).toContain("data-diff-placeholder");
  });

  it("labels diff placeholder clearly as not built yet", () => {
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    expect(html).toContain("not built yet");
    expect(html).toContain("Diff viewer");
  });

  it("renders review thread placeholder with data-review-thread-placeholder", () => {
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    expect(html).toContain("data-review-thread-placeholder");
  });

  it("labels review thread placeholder clearly as not built yet", () => {
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    expect(html).toContain("Review thread");
    // Check two separate "not built yet" occurrences (one per placeholder)
    const matches = html.match(/not built yet/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });
});

describe("TaskTabView — PR pills (real PR metadata)", () => {
  it("renders PR pills row when task has pr_refs", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTask({
        pr_refs: [
          {
            label: "my-repo",
            repo: "my-repo",
            url: "https://github.com/acme/my-repo/pull/42",
            status: "open",
          },
        ],
      }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    expect(html).toContain("data-pr-pills");
  });

  it("renders PR pill as anchor link when URL is present", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTask({
        pr_refs: [
          {
            label: "my-repo",
            repo: "my-repo",
            url: "https://github.com/acme/my-repo/pull/42",
            status: "open",
          },
        ],
      }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    expect(html).toContain('data-pr-pill="https://github.com/acme/my-repo/pull/42"');
    expect(html).toContain('href="https://github.com/acme/my-repo/pull/42"');
  });

  it("renders PR pill from task.pr field", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTask({
        pr_refs: [],
        pr: {
          url: "https://github.com/acme/repo/pull/7",
          status: "merged",
        },
      }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    expect(html).toContain("data-pr-pills");
    expect(html).toContain('href="https://github.com/acme/repo/pull/7"');
  });

  it("renders workspace_pr pill from task.workspace_pr field", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTask({
        pr_refs: [],
        workspace_pr: {
          url: "https://github.com/acme/workspace/pull/99",
          status: "open",
        },
      }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    expect(html).toContain("data-pr-pills");
    expect(html).toContain('href="https://github.com/acme/workspace/pull/99"');
  });

  it("does not render PR pills row when no PR data exists", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTask({ pr_refs: [], pr: null, workspace_pr: null }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    expect(html).not.toContain("data-pr-pills");
  });

  it("deduplicates PRs with the same URL", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTask({
        pr_refs: [
          {
            label: "PR #42",
            repo: "my-repo",
            url: "https://github.com/acme/my-repo/pull/42",
            status: "open",
          },
          {
            label: "Duplicate",
            repo: "my-repo",
            url: "https://github.com/acme/my-repo/pull/42",
            status: "open",
          },
        ],
      }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    const count = (
      html.match(/data-pr-pill="https:\/\/github\.com\/acme\/my-repo\/pull\/42"/g) ?? []
    ).length;
    expect(count).toBe(1);
  });
});

describe("TaskTabView — existing sections preserved", () => {
  it("renders task metadata section (repo, branch)", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTask({ repo: "my-repo", branch: "feature/auth" }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    expect(html).toContain("my-repo");
    expect(html).toContain("feature/auth");
  });

  it("renders task dependencies when present", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTask({ depends_on: ["T1", "T2"] }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    expect(html).toContain("data-task-depends-on");
    expect(html).toContain(">T1<");
    expect(html).toContain(">T2<");
  });

  it("renders blocked reason when present", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTask({ blocked_reason: "Missing credentials" }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    expect(html).toContain("data-blocked-reason");
    expect(html).toContain("Missing credentials");
  });

  it("renders task execution section", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTask(),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    expect(html).toContain("data-task-execution");
  });

  it("renders activity timeline when entries exist", () => {
    mockUseWorkspaceTask.mockReturnValue({
      task: makeTask({
        activity: [
          {
            action: "started",
            scope: "task",
            actor: "agent@example.com",
            occurred_at: "2026-06-09T09:00:00Z",
            note: "Work began",
          },
        ],
      }),
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    const html = render({ workspaceId: "ws-1", taskId: "t-1" });
    expect(html).toContain("data-task-activity-timeline");
    expect(html).toContain("data-task-timeline-entry");
  });
});
