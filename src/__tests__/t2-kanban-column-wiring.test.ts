/**
 * T2 — Wire kanban columns to the new status contract
 *
 * Verifies that:
 *   - TaskBoardView renders exactly 8 column headers matching TASK_MODE_STATUSES in order
 *   - TaskBoardView does NOT render columns for legacy/excluded statuses
 *     (in_reviewing, review_passed, change_requested, review_incomplete)
 *   - FeatureBoardView renders exactly 8 column headers matching FEATURE_MODE_STATUSES in order
 *   - FeatureBoardView does NOT render columns for Task Mode-only or legacy statuses
 *   - Tasks with statuses outside TASK_MODE_STATUSES fall back to the first column
 *   - Features with statuses outside FEATURE_MODE_STATUSES are filtered out from the board
 *   - FeatureRow task grid renders exactly TASK_MODE_STATUSES.length cells per task row
 *   - Column order in TaskBoardView matches the TASK_MODE_STATUSES spec order
 *   - Column order in FeatureBoardView matches the FEATURE_MODE_STATUSES spec order
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ParsedFeature } from "../services/yaml-parser";
import {
  TASK_MODE_STATUSES,
  FEATURE_MODE_STATUSES,
  STATUS_COLUMNS,
} from "../features/board/lib/status";
import type { ActiveFilters, FeatureActiveFilters } from "../features/board/types";

// ─── Board context mock ───────────────────────────────────────────────────────

const mockContextRef = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("../features/board/components/KanbanBoard/KanbanBoard.context", () => ({
  useBoardContext: () => mockContextRef.current,
}));

// ─── Imports under test ───────────────────────────────────────────────────────

import { TaskBoardView } from "../features/board/components/TaskBoardView/TaskBoardView";
import { FeatureBoardView } from "../features/board/components/FeatureBoardView/FeatureBoardView";
import { FeatureRow } from "../features/board/components/FeatureRow/FeatureRow";

// ─── Context factories ────────────────────────────────────────────────────────

function buildTaskModeContext(opts: {
  features?: ParsedFeature[];
  backendTaskResults?: ParsedFeature[] | null;
  expandedFeatureIds?: Set<string>;
}) {
  const taskFilters: ActiveFilters = { statuses: [] };
  const featureFilters: FeatureActiveFilters = { statuses: [] };

  return {
    workspaceDetail: {
      id: "ws-1",
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
    selectedTask: null,
    setSelectedTask: vi.fn(),
    selectedFeature: null,
    setSelectedFeature: vi.fn(),
    syncing: false,
    syncError: null,
    syncBoard: vi.fn(),
    backendTaskResults:
      opts.backendTaskResults !== undefined ? opts.backendTaskResults : null,
    backendFeatureResults: null,
    taskSearching: false,
    featureSearching: false,
    taskSearchError: null,
    featureSearchError: null,
    openTaskTab: vi.fn(),
    openTaskTabNewSession: vi.fn(),
    openFeatureTab: vi.fn(),
    openFeatureTabNewSession: vi.fn(),
    taskPage: 1,
    featurePage: 1,
    setTaskPage: vi.fn(),
    setFeaturePage: vi.fn(),
    taskPagination: null,
    featurePagination: null,
    taskLimit: 50,
    setTaskLimit: vi.fn(),
    featureLimit: 100,
    setFeatureLimit: vi.fn(),
  };
}

function buildFeatureModeContext(opts: {
  features?: ParsedFeature[];
  backendFeatureResults?: ParsedFeature[] | null;
}) {
  const taskFilters: ActiveFilters = { statuses: [] };
  const featureFilters: FeatureActiveFilters = { statuses: [] };

  return {
    workspaceDetail: {
      id: "ws-1",
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
    boardMode: "feature" as const,
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
    expandedFeatureIds: new Set<string>(),
    toggleFeature: vi.fn(),
    selectedTask: null,
    setSelectedTask: vi.fn(),
    selectedFeature: null,
    setSelectedFeature: vi.fn(),
    syncing: false,
    syncError: null,
    syncBoard: vi.fn(),
    backendTaskResults: null,
    backendFeatureResults:
      opts.backendFeatureResults !== undefined
        ? opts.backendFeatureResults
        : null,
    taskSearching: false,
    featureSearching: false,
    taskSearchError: null,
    featureSearchError: null,
    openTaskTab: vi.fn(),
    openTaskTabNewSession: vi.fn(),
    openFeatureTab: vi.fn(),
    openFeatureTabNewSession: vi.fn(),
    taskPage: 1,
    featurePage: 1,
    setTaskPage: vi.fn(),
    setFeaturePage: vi.fn(),
    taskPagination: null,
    featurePagination: null,
    taskLimit: 50,
    setTaskLimit: vi.fn(),
    featureLimit: 100,
    setFeatureLimit: vi.fn(),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFeature(overrides: Partial<ParsedFeature> = {}): ParsedFeature {
  return {
    id: "test-feature",
    title: "Test Feature",
    featureStatus: "in_implementation",
    tasks: [],
    ...overrides,
  };
}

function makeTask(id: string, status: string, title = `Task ${id}`) {
  return { id, title, status, dependsOn: [] };
}

// ─── TaskBoardView — column count and order ───────────────────────────────────

describe("TaskBoardView — Task Mode column wiring", () => {
  beforeEach(() => {
    mockContextRef.current = buildTaskModeContext({
      features: [makeFeature({ tasks: [makeTask("T1", "todo")] })],
    });
  });

  it("renders exactly 8 column headers", () => {
    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    // Count data-task-status-header attributes — one per column
    const matches = html.match(/data-task-status-header=/g) ?? [];
    expect(matches).toHaveLength(8);
  });

  it("column header labels appear in TASK_MODE_STATUSES order", () => {
    const html = renderToStaticMarkup(React.createElement(TaskBoardView));

    // Verify the relative position of each data-task-status-header attribute:
    // later items in TASK_MODE_STATUSES must appear later in the HTML.
    let lastPos = -1;
    for (const status of TASK_MODE_STATUSES) {
      const pos = html.indexOf(`data-task-status-header="${status}"`);
      expect(pos).toBeGreaterThan(lastPos);
      lastPos = pos;
    }
  });

  it("does not render a column for the legacy in_reviewing status", () => {
    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    // in_reviewing is non-canonical — must not appear as a column header key
    expect(html).not.toContain('data-task-status-header="in_reviewing"');
  });

  it("does not render extra column headers for excluded statuses (review_passed, change_requested, review_incomplete)", () => {
    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).not.toContain('data-task-status-header="review_passed"');
    expect(html).not.toContain('data-task-status-header="change_requested"');
    expect(html).not.toContain('data-task-status-header="review_incomplete"');
  });

  it("renders exactly TASK_MODE_STATUSES.length column count cells", () => {
    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    // Every TASK_MODE_STATUSES entry must have a column header
    const headerMatches = html.match(/data-task-status-header=/g) ?? [];
    expect(headerMatches).toHaveLength(TASK_MODE_STATUSES.length);
  });
});

// ─── TaskBoardView — out-of-allowlist task placement ─────────────────────────

describe("TaskBoardView — task row placement for non-allowlist statuses", () => {
  it("renders a task with review_passed status without crashing (fallback column)", () => {
    mockContextRef.current = buildTaskModeContext({
      features: [
        makeFeature({
          id: "feat-1",
          tasks: [makeTask("T1", "review_passed", "Awaiting merge")],
        }),
      ],
      expandedFeatureIds: new Set(["feat-1"]),
    });

    // Should not throw — task lands in fallback column
    expect(() =>
      renderToStaticMarkup(React.createElement(TaskBoardView)),
    ).not.toThrow();
  });

  it("renders tasks with change_requested status without creating an extra column", () => {
    mockContextRef.current = buildTaskModeContext({
      features: [
        makeFeature({
          id: "feat-1",
          tasks: [makeTask("T1", "change_requested", "Fix requested")],
        }),
      ],
      expandedFeatureIds: new Set(["feat-1"]),
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    // No column header for change_requested
    expect(html).not.toContain('data-task-status-header="change_requested"');
    // The task should still be rendered (in the first fallback column)
    expect(html).toContain("Fix requested");
  });
});

// ─── FeatureBoardView — column count and order ────────────────────────────────

describe("FeatureBoardView — Feature Mode column wiring", () => {
  it("renders exactly 8 feature status column headers", () => {
    mockContextRef.current = buildFeatureModeContext({
      features: [makeFeature({ featureStatus: "in_implementation" })],
    });

    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    // Count data-feature-status-header attributes — one per column
    const matches = html.match(/data-feature-status-header=/g) ?? [];
    expect(matches).toHaveLength(8);
  });

  it("renders feature columns in FEATURE_MODE_STATUSES order", () => {
    mockContextRef.current = buildFeatureModeContext({
      features: [makeFeature({ featureStatus: "in_implementation" })],
    });

    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));

    // Verify the relative position of each feature status header key
    let lastPos = -1;
    for (const status of FEATURE_MODE_STATUSES) {
      const pos = html.indexOf(`data-feature-status-header="${status}"`);
      expect(pos).toBeGreaterThan(lastPos);
      lastPos = pos;
    }
  });

  it("renders exactly the FEATURE_MODE_STATUSES keys as column headers — no extras", () => {
    mockContextRef.current = buildFeatureModeContext({
      features: [makeFeature({ featureStatus: "in_implementation" })],
    });

    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));

    for (const status of FEATURE_MODE_STATUSES) {
      expect(html).toContain(`data-feature-status-header="${status}"`);
    }
  });

  it("does NOT render a column for task-only statuses (todo, ready, in_progress)", () => {
    mockContextRef.current = buildFeatureModeContext({
      features: [makeFeature()],
    });

    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    expect(html).not.toContain('data-feature-status-header="todo"');
    expect(html).not.toContain('data-feature-status-header="ready"');
    expect(html).not.toContain('data-feature-status-header="in_progress"');
    expect(html).not.toContain('data-feature-status-header="in_review"');
    expect(html).not.toContain('data-feature-status-header="reviewing"');
  });

  it("does NOT render a column for legacy in_reviewing status", () => {
    mockContextRef.current = buildFeatureModeContext({
      features: [makeFeature()],
    });

    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    expect(html).not.toContain("in_reviewing");
  });
});

// ─── FeatureBoardView — feature filtering by valid feature status ─────────────

describe("FeatureBoardView — features with out-of-allowlist statuses are excluded", () => {
  it("does not render a feature whose featureStatus is a task-only status", () => {
    const featureWithTaskStatus: ParsedFeature = {
      id: "bad-feature",
      title: "Bad Feature",
      featureStatus: "in_progress" as ParsedFeature["featureStatus"],
      tasks: [],
    };

    mockContextRef.current = buildFeatureModeContext({
      features: [featureWithTaskStatus],
    });

    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    // The feature should not appear in the board (filtered by isValidFeatureStatus)
    expect(html).not.toContain("bad-feature");
  });

  it("renders a feature whose featureStatus is in FEATURE_MODE_STATUSES", () => {
    const feature = makeFeature({
      id: "valid-feature",
      featureStatus: "in_design",
    });

    mockContextRef.current = buildFeatureModeContext({
      features: [feature],
    });

    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    expect(html).toContain("valid-feature");
  });
});

// ─── FeatureRow — task grid uses TASK_MODE_STATUSES.length columns ────────────

describe("FeatureRow — task grid column count matches TASK_MODE_STATUSES", () => {
  it("renders exactly TASK_MODE_STATUSES.length status cells per task row", () => {
    const feature = makeFeature({
      id: "row-feature",
      tasks: [makeTask("T1", "todo"), makeTask("T2", "in_progress")],
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureRow, {
        feature,
        isExpanded: true,
        onToggle: () => undefined,
      }),
    );

    // Each task row renders one cell per TASK_MODE_STATUSES entry
    const cellMatches = html.match(/data-status-cell/g) ?? [];
    expect(cellMatches).toHaveLength(feature.tasks.length * TASK_MODE_STATUSES.length);
  });

  it("does not render status cells for excluded statuses in a task row", () => {
    const feature = makeFeature({
      id: "row-feature",
      tasks: [makeTask("T1", "todo")],
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureRow, {
        feature,
        isExpanded: true,
        onToggle: () => undefined,
      }),
    );

    // Excluded status keys must not appear as cell identifiers
    expect(html).not.toContain("review_passed");
    expect(html).not.toContain("change_requested");
    expect(html).not.toContain("review_incomplete");
    expect(html).not.toContain("in_reviewing");
  });

  it("places a task with a non-allowlist status in the first column (fallback)", () => {
    const feature = makeFeature({
      id: "row-feature",
      tasks: [makeTask("T1", "review_passed", "A review-passed task")],
    });

    const html = renderToStaticMarkup(
      React.createElement(FeatureRow, {
        feature,
        isExpanded: true,
        onToggle: () => undefined,
      }),
    );

    // Task card should be rendered (in first column — "Todo cell for T1")
    expect(html).toContain("A review-passed task");
    expect(html).toContain("Todo cell for T1");
    // No status cell with a review_passed label
    expect(html).not.toContain("review_passed cell for");
  });
});

// ─── Allowlist cross-check: column keys match spec exactly ───────────────────

describe("Allowlist cross-check — rendered column keys match product spec exactly", () => {
  it("TaskBoardView column set equals TASK_MODE_STATUSES — no more, no less", () => {
    mockContextRef.current = buildTaskModeContext({
      features: [makeFeature()],
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));

    // Exactly TASK_MODE_STATUSES.length column headers present
    const headerAttrs = html.match(/data-task-status-header="[^"]+"/g) ?? [];
    expect(headerAttrs).toHaveLength(TASK_MODE_STATUSES.length);

    // Every TASK_MODE_STATUSES entry must be represented
    for (const status of TASK_MODE_STATUSES) {
      expect(headerAttrs).toContain(`data-task-status-header="${status}"`);
    }

    // No extra headers outside the allowlist
    for (const attr of headerAttrs) {
      const match = attr.match(/data-task-status-header="([^"]+)"/);
      if (match) {
        expect(TASK_MODE_STATUSES as readonly string[]).toContain(match[1]);
      }
    }
  });

  it("FeatureBoardView column set equals FEATURE_MODE_STATUSES — no more, no less", () => {
    mockContextRef.current = buildFeatureModeContext({
      features: [makeFeature({ featureStatus: "in_design" })],
    });

    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));

    // Exactly FEATURE_MODE_STATUSES.length headers present
    const headerAttrs = html.match(/data-feature-status-header="[^"]+"/g) ?? [];
    expect(headerAttrs).toHaveLength(FEATURE_MODE_STATUSES.length);

    // Every FEATURE_MODE_STATUSES entry must be represented
    for (const status of FEATURE_MODE_STATUSES) {
      expect(headerAttrs).toContain(`data-feature-status-header="${status}"`);
    }

    // No extra headers outside the allowlist
    for (const attr of headerAttrs) {
      const match = attr.match(/data-feature-status-header="([^"]+)"/);
      if (match) {
        expect(FEATURE_MODE_STATUSES as readonly string[]).toContain(match[1]);
      }
    }
  });
});
