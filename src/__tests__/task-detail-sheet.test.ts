import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedTask } from "../services/yaml-parser";
import { TaskDetailSheet, TaskDetailSheetMount } from "../features/tasks";

const mockBoardContext = vi.hoisted(() => ({
  selectedTask: null as unknown,
  setSelectedTask: vi.fn(),
  workspace: {
    owner: "tiendv89",
    repo: "digital-factory-ui",
  },
}));

vi.mock("@/features/board/components/KanbanBoard", () => ({
  useBoardContext: () => mockBoardContext,
}));

const task: ParsedTask = {
  id: "T5",
  title: "Inspect task details",
  status: "in_review",
  dependsOn: ["T1", "T2"],
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
});
