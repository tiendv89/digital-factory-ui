// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

import type { RepoPill, ThreadEntry } from "@/components/tasks/task-review-view";
import { DiffPanel, SpecPanel, ThreadPanel } from "@/components/tasks/task-review-view";
import type { UseTaskDiffResult } from "@/hooks/tasks/use-task-diff";
import type { UseTaskReviewThreadResult } from "@/hooks/tasks/use-task-review-thread";
import type { TaskSummary } from "@/services/workflow-backend/types";

const noop = () => {};

const baseTask: TaskSummary = {
  id: "abc12345",
  task_id: "T5",
  task_name: "T5",
  feature_id: "feat-1",
  feature_name: "Feature One",
  title: "My Task Title",
  status: "in_review",
  repo: "digital-factory-ui",
  branch: "feature/feat-1-T5",
  is_blocked: false,
};

function makeDiffResult(overrides: Partial<UseTaskDiffResult> = {}): UseTaskDiffResult {
  return {
    data: null,
    loading: false,
    error: null,
    reload: noop,
    ...overrides,
  };
}

function makeThreadResult(overrides: Partial<UseTaskReviewThreadResult> = {}): UseTaskReviewThreadResult {
  return {
    data: null,
    loading: false,
    error: null,
    reload: noop,
    ...overrides,
  };
}

// ──────────────────────────────────────────────────────────────────────
// DiffPanel
// ──────────────────────────────────────────────────────────────────────

describe("DiffPanel", () => {
  it("no-PR state: shows no-PR message", () => {
    render(<DiffPanel hasPr={false} diffResult={makeDiffResult()} />);
    expect(screen.getByText(/No pull request yet/i)).toBeInTheDocument();
  });

  it("loading state: shows loading indicator", () => {
    render(<DiffPanel hasPr={true} diffResult={makeDiffResult({ loading: true })} />);
    expect(screen.getByText(/Loading diff/i)).toBeInTheDocument();
  });

  it("error state: shows error message with retry button", () => {
    const reload = vi.fn();
    render(
      <DiffPanel
        hasPr={true}
        diffResult={makeDiffResult({
          error: {
            message: "403 Forbidden",
            code: "forbidden",
            retryable: false,
          },
          reload,
        })}
      />,
    );
    expect(screen.getByText(/Failed to load diff/i)).toBeInTheDocument();
    expect(screen.getByText(/Retry/i)).toBeInTheDocument();
  });

  it("empty state: shows no-changes message when files array is empty", () => {
    render(
      <DiffPanel
        hasPr={true}
        diffResult={makeDiffResult({
          data: { files: [], total_additions: 0, total_deletions: 0 },
        })}
      />,
    );
    expect(screen.getByText(/No changes in this pull request/i)).toBeInTheDocument();
  });

  it("renders file list when data has files", () => {
    render(
      <DiffPanel
        hasPr={true}
        diffResult={makeDiffResult({
          data: {
            files: [
              {
                filename: "src/foo.ts",
                status: "modified",
                additions: 3,
                deletions: 1,
                changes: 4,
                patch: "+new line\n-old line",
              },
            ],
            total_additions: 3,
            total_deletions: 1,
          },
        })}
      />,
    );
    expect(screen.getByText("src/foo.ts")).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────────────
// ThreadPanel
// ──────────────────────────────────────────────────────────────────────

describe("ThreadPanel", () => {
  it("no-PR state: shows no-PR message", () => {
    render(<ThreadPanel hasPr={false} threadResult={makeThreadResult()} threadEntries={[]} currentRepo={undefined} />);
    expect(screen.getByText(/No pull request yet/i)).toBeInTheDocument();
  });

  it("loading state: shows loading indicator", () => {
    render(<ThreadPanel hasPr={true} threadResult={makeThreadResult({ loading: true })} threadEntries={[]} currentRepo={undefined} />);
    expect(screen.getByText(/Loading review thread/i)).toBeInTheDocument();
  });

  it("error state: shows error message with retry button", () => {
    const reload = vi.fn();
    render(
      <ThreadPanel
        hasPr={true}
        threadResult={makeThreadResult({
          error: { message: "500", code: "internal_error", retryable: true },
          reload,
        })}
        threadEntries={[]}
        currentRepo={undefined}
      />,
    );
    expect(screen.getByText(/Failed to load review thread/i)).toBeInTheDocument();
    expect(screen.getByText(/Retry/i)).toBeInTheDocument();
  });

  it("empty state: shows no-activity message when threadEntries is empty", () => {
    render(<ThreadPanel hasPr={true} threadResult={makeThreadResult({ data: { items: [] } })} threadEntries={[]} currentRepo={undefined} />);
    expect(screen.getByText(/No review activity yet/i)).toBeInTheDocument();
  });

  it("shows workflow-managed note when entries are present", () => {
    const entries: ThreadEntry[] = [
      {
        id: "github-review-1",
        source: "github",
        kind: "review",
        author: "reviewer",
        body: "LGTM",
        state: "APPROVED",
        at: "2026-01-01T01:00:00Z",
      },
    ];
    render(<ThreadPanel hasPr={true} threadResult={makeThreadResult({ data: { items: [] } })} threadEntries={entries} currentRepo={undefined} />);
    expect(screen.getByText(/managed by the review workflow/i)).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────────────
// SpecPanel
// ──────────────────────────────────────────────────────────────────────

describe("SpecPanel", () => {
  it("renders task title", () => {
    render(<SpecPanel task={baseTask} />);
    expect(screen.getByText("My Task Title")).toBeInTheDocument();
  });

  it("renders task_id as uppercase identifier", () => {
    render(<SpecPanel task={baseTask} />);
    expect(screen.getByText("T5")).toBeInTheDocument();
  });

  it("renders description when present", () => {
    render(<SpecPanel task={{ ...baseTask, description: "Detailed description here." }} />);
    expect(screen.getByText("Detailed description here.")).toBeInTheDocument();
  });

  it("does not render description section when absent", () => {
    const { queryByText } = render(<SpecPanel task={{ ...baseTask, description: undefined }} />);
    expect(queryByText("Description")).not.toBeInTheDocument();
  });

  it("renders depends_on list when non-empty", () => {
    render(<SpecPanel task={{ ...baseTask, depends_on: ["T1", "T3"] }} />);
    expect(screen.getByText("T1")).toBeInTheDocument();
    expect(screen.getByText("T3")).toBeInTheDocument();
  });

  it("does not render depends_on section for empty array", () => {
    const { queryByText } = render(<SpecPanel task={{ ...baseTask, depends_on: [] }} />);
    expect(queryByText("Depends on")).not.toBeInTheDocument();
  });

  it("renders blocked_reason when present", () => {
    render(<SpecPanel task={{ ...baseTask, blocked_reason: "Missing credentials." }} />);
    expect(screen.getByText("Missing credentials.")).toBeInTheDocument();
  });

  it("does not render blocked section when blocked_reason is absent", () => {
    const { queryByText } = render(<SpecPanel task={{ ...baseTask, blocked_reason: undefined }} />);
    expect(queryByText("Blocked")).not.toBeInTheDocument();
  });

  it("renders repo and branch fields", () => {
    render(<SpecPanel task={baseTask} />);
    expect(screen.getByText("digital-factory-ui")).toBeInTheDocument();
    expect(screen.getByText("feature/feat-1-T5")).toBeInTheDocument();
  });
});
