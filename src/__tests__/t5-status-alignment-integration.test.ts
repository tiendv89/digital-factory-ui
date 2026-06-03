/**
 * T5 — Regression and integration validation: kanban-board-status-alignment
 *
 * Covers subtask checklist items not yet fully addressed by T1–T4 unit tests:
 *
 *   1. Sidebar label rendering: in_review → "In review", reviewing → "In review"
 *      (clientStatusLabel contract used by TaskTrackingPanel sidebar)
 *   2. Feature Mode and Task Mode render only approved columns (cross-cutting check)
 *   3. `in_reviewing` is NOT used as a status value anywhere in the rendering path
 *   4. Frontend consumes /features?include=tasks&status=... without showing
 *      empty-match features after the backend change (T4)
 *   5. Frontend does not reintroduce empty-match feature rows from workspace root
 *      when backendTaskResults is set
 *   6. Integration: status filters → API params → board rendering path is consistent
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ParsedFeature } from "../services/yaml-parser";
import type {
  ActiveFilters,
  FeatureActiveFilters,
} from "../features/board/types";
import {
  TASK_MODE_STATUSES,
  FEATURE_MODE_STATUSES,
  STATUS_COLUMNS,
  FEATURE_STATUS_OPTIONS,
  clientStatusLabel,
  getTaskStatusLabel,
} from "../features/board/lib/status";
import {
  buildFeatureTaskParams,
  TASK_MODE_FEATURE_TASK_PARAMS,
} from "../services/workflow-backend/query-params";
import { getAllStatusFilterKeys } from "../features/board/lib/status-filter";
import { getAllFeatureStatusFilterKeys } from "../features/board/lib/feature-status-filter";
import { adaptFeatureWithTasksToFeatures } from "../features/workspaces/lib/workspaceAdapter";
import type {
  FeatureWithTasks,
  TaskSummaryWithUpdatedAt,
} from "../services/workflow-backend/types";

// ─── Board context mock ───────────────────────────────────────────────────────

const mockContextRef = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("../features/board/components/KanbanBoard/KanbanBoard.context", () => ({
  useBoardContext: () => mockContextRef.current,
}));

import { TaskBoardView } from "../features/board/components/TaskBoardView/TaskBoardView";
import { FeatureBoardView } from "../features/board/components/FeatureBoardView/FeatureBoardView";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeFeature(overrides: Partial<ParsedFeature> = {}): ParsedFeature {
  return {
    id: "test-feature",
    title: "Test Feature",
    featureStatus: "in_implementation",
    tasks: [],
    ...overrides,
  };
}

function makeTask(id: string, title: string, status: string) {
  return { id, title, status, dependsOn: [] };
}

function makeBackendTask(
  overrides: Partial<TaskSummaryWithUpdatedAt> = {},
): TaskSummaryWithUpdatedAt {
  return {
    id: "task-uuid-1",
    task_id: "task-uuid-1",
    task_name: "T1",
    feature_id: "feat-uuid-1",
    feature_name: "my-feature",
    title: "Backend task",
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

function makeFeatureWithTasks(
  overrides: Partial<FeatureWithTasks> = {},
): FeatureWithTasks {
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
    tasks: [makeBackendTask()],
    ...overrides,
  };
}

function buildTaskModeContext(opts: {
  features?: ParsedFeature[];
  backendTaskResults?: ParsedFeature[] | null;
  expandedFeatureIds?: Set<string>;
  taskSearching?: boolean;
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
    taskSearching: opts.taskSearching ?? false,
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

function buildFeatureModeContext(opts: { features?: ParsedFeature[] }) {
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

// ─── 1. Sidebar label rendering ───────────────────────────────────────────────

describe("Sidebar label rendering — clientStatusLabel contract", () => {
  it("maps in_review to 'In review' (sidebar/client label)", () => {
    expect(clientStatusLabel("in_review")).toBe("In review");
  });

  it("maps reviewing to 'In Reviewing' (sidebar/client label)", () => {
    expect(clientStatusLabel("reviewing")).toBe("In Reviewing");
  });

  it("does NOT map in_reviewing to 'In review' — in_reviewing is non-canonical", () => {
    expect(clientStatusLabel("in_reviewing")).not.toBe("In review");
    expect(clientStatusLabel("in_reviewing")).not.toBe("In Reviewing");
  });

  it("maps all TASK_MODE_STATUSES to non-empty sidebar labels", () => {
    for (const status of TASK_MODE_STATUSES) {
      const label = clientStatusLabel(status);
      expect(label).toBeTruthy();
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it("sidebar label for in_review is distinct from the non-canonical in_reviewing label", () => {
    const canonicalLabel = clientStatusLabel("in_review");
    const nonCanonicalLabel = clientStatusLabel("in_reviewing");
    expect(canonicalLabel).not.toBe(nonCanonicalLabel);
  });
});

// ─── 2. Board status label rendering — getTaskStatusLabel contract ────────────

describe("Board status label — getTaskStatusLabel canonical contract", () => {
  it("in_review renders as 'In review' in board column headers", () => {
    expect(getTaskStatusLabel("in_review")).toBe("In review");
  });

  it("reviewing renders as 'In reviewing' in board column headers", () => {
    expect(getTaskStatusLabel("reviewing")).toBe("In reviewing");
  });

  it("in_reviewing is NOT a board column — label fallback only", () => {
    const label = getTaskStatusLabel("in_reviewing");
    expect(label).not.toBe("In reviewing");
    expect(label).toBe("in reviewing");
  });

  it("STATUS_COLUMNS has no entry for in_reviewing", () => {
    const keys = STATUS_COLUMNS.map((c) => c.key);
    expect(keys).not.toContain("in_reviewing");
  });

  it("STATUS_COLUMNS in_review entry has label 'In review'", () => {
    const col = STATUS_COLUMNS.find((c) => c.key === "in_review");
    expect(col?.label).toBe("In review");
  });

  it("STATUS_COLUMNS reviewing entry has label 'In reviewing'", () => {
    const col = STATUS_COLUMNS.find((c) => c.key === "reviewing");
    expect(col?.label).toBe("In reviewing");
  });
});

// ─── 3. in_reviewing not used in filter or column allowlists ─────────────────

describe("in_reviewing absent from all mode allowlists and filters", () => {
  it("TASK_MODE_STATUSES does not contain in_reviewing", () => {
    expect(TASK_MODE_STATUSES).not.toContain("in_reviewing");
  });

  it("FEATURE_MODE_STATUSES does not contain in_reviewing", () => {
    expect(FEATURE_MODE_STATUSES).not.toContain("in_reviewing");
  });

  it("Task Mode filter keys do not contain in_reviewing", () => {
    expect(getAllStatusFilterKeys()).not.toContain("in_reviewing");
  });

  it("Feature Mode filter keys do not contain in_reviewing", () => {
    expect(getAllFeatureStatusFilterKeys()).not.toContain("in_reviewing");
  });

  it("STATUS_COLUMNS do not contain in_reviewing as a key", () => {
    expect(STATUS_COLUMNS.map((c) => c.key)).not.toContain("in_reviewing");
  });

  it("FEATURE_STATUS_OPTIONS do not contain in_reviewing as a key", () => {
    expect(FEATURE_STATUS_OPTIONS.map((o) => o.key)).not.toContain(
      "in_reviewing",
    );
  });
});

// ─── 4. API params: include=tasks is always set (T4 backend integration) ──────

describe("API params: include=tasks is always set for Task Mode", () => {
  it("buildFeatureTaskParams always includes include=tasks", () => {
    const sp = buildFeatureTaskParams({});
    expect(sp.get("include")).toBe("tasks");
  });

  it("TASK_MODE_FEATURE_TASK_PARAMS always includes include=tasks", () => {
    const sp = buildFeatureTaskParams(TASK_MODE_FEATURE_TASK_PARAMS);
    expect(sp.get("include")).toBe("tasks");
  });

  it("buildFeatureTaskParams with status filter includes include=tasks", () => {
    const sp = buildFeatureTaskParams({
      status: "in_progress,blocked,in_review,reviewing",
    });
    expect(sp.get("include")).toBe("tasks");
    expect(sp.get("status")).toContain("in_review");
    expect(sp.get("status")).toContain("reviewing");
  });

  it("status param does not contain in_reviewing for any Task Mode default", () => {
    const sp = buildFeatureTaskParams(TASK_MODE_FEATURE_TASK_PARAMS);
    const statusParam = sp.get("status") ?? "";
    expect(statusParam).not.toContain("in_reviewing");
  });

  it("default Task Mode status list does not include excluded statuses", () => {
    const sp = buildFeatureTaskParams(TASK_MODE_FEATURE_TASK_PARAMS);
    const statusParam = sp.get("status") ?? "";
    expect(statusParam).not.toContain("review_passed");
    expect(statusParam).not.toContain("review_incomplete");
    expect(statusParam).not.toContain("change_requested");
  });
});

// ─── 5. Frontend renders backend results as-is (no empty-match reintroduction) ─

describe("TaskBoardView — frontend does not reintroduce empty-match features", () => {
  it("uses backendTaskResults exclusively when set, ignoring workspace root features", () => {
    const workspaceFeature = makeFeature({
      id: "workspace-feature",
      tasks: [makeTask("T1", "Workspace root task", "in_progress")],
    });
    const backendFeature = makeFeature({
      id: "backend-feature",
      tasks: [makeTask("T2", "Backend-filtered task", "blocked")],
    });

    mockContextRef.current = buildTaskModeContext({
      features: [workspaceFeature],
      backendTaskResults: [backendFeature],
      expandedFeatureIds: new Set(["workspace-feature", "backend-feature"]),
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));

    // backendTaskResults are shown
    expect(html).toContain("Backend-filtered task");
    // workspace root features are NOT shown when backendTaskResults is set
    expect(html).not.toContain("Workspace root task");
  });

  it("shows all workspace root features when backendTaskResults is null (no active filter)", () => {
    const wsFeature = makeFeature({
      id: "ws-feat",
      tasks: [makeTask("T1", "Workspace task", "ready")],
    });

    mockContextRef.current = buildTaskModeContext({
      features: [wsFeature],
      backendTaskResults: null,
      expandedFeatureIds: new Set(["ws-feat"]),
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).toContain("Workspace task");
  });

  it("shows 'No tasks match' when backendTaskResults is empty (backend filtered all out)", () => {
    const wsFeature = makeFeature({
      id: "ws-feat",
      tasks: [makeTask("T1", "WS task", "done")],
    });

    mockContextRef.current = buildTaskModeContext({
      features: [wsFeature],
      backendTaskResults: [],
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).toContain("No tasks match");
    // workspace root tasks must not appear
    expect(html).not.toContain("WS task");
  });

  it("renders each backend feature row even if tasks are empty (backend controls filtering)", () => {
    const featureWithEmptyTasks = makeFeature({
      id: "empty-task-feature",
      title: "Feature With No Matching Tasks",
      tasks: [],
    });

    mockContextRef.current = buildTaskModeContext({
      features: [],
      backendTaskResults: [featureWithEmptyTasks],
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    // The feature row is rendered (backend already decided to include it)
    // but visibleFeatures has 1 entry so no empty-state renders
    expect(html).not.toContain("No tasks match");
    expect(html).toContain("empty-task-feature");
  });

  it("does NOT render workspace root features after backend excludes them", () => {
    const doneFeature = makeFeature({
      id: "done-feature",
      tasks: [makeTask("T1", "Done task", "done")],
    });
    // Backend filtered this feature out → backendTaskResults is empty for this filter
    mockContextRef.current = buildTaskModeContext({
      features: [doneFeature],
      backendTaskResults: [],
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).toContain("No tasks match");
    expect(html).not.toContain("done-feature");
    expect(html).not.toContain("Done task");
  });
});

// ─── 6. adaptFeatureWithTasksToFeatures — backend adapter ────────────────────

describe("adaptFeatureWithTasksToFeatures — handles backend-filtered results", () => {
  it("converts backend features with tasks to ParsedFeature array", () => {
    const backendFeatures = [
      makeFeatureWithTasks({
        feature_name: "my-feature",
        tasks: [makeBackendTask({ status: "in_progress" })],
      }),
    ];

    const result = adaptFeatureWithTasksToFeatures(backendFeatures);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("my-feature");
    expect(result[0].tasks).toHaveLength(1);
    expect(result[0].tasks[0].status).toBe("in_progress");
  });

  it("preserves task status values including in_review and reviewing", () => {
    const backendFeatures = [
      makeFeatureWithTasks({
        tasks: [
          makeBackendTask({ status: "in_review", task_name: "T1" }),
          makeBackendTask({ status: "reviewing", task_name: "T2" }),
        ],
      }),
    ];

    const result = adaptFeatureWithTasksToFeatures(backendFeatures);
    const statuses = result[0].tasks.map((t) => t.status);
    expect(statuses).toContain("in_review");
    expect(statuses).toContain("reviewing");
    // in_reviewing must not appear
    expect(statuses).not.toContain("in_reviewing");
  });

  it("handles features with empty task arrays (backend may return these before T4 fix)", () => {
    const backendFeatures = [makeFeatureWithTasks({ tasks: [] })];

    const result = adaptFeatureWithTasksToFeatures(backendFeatures);
    expect(result).toHaveLength(1);
    expect(result[0].tasks).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    expect(adaptFeatureWithTasksToFeatures([])).toHaveLength(0);
  });

  it("maps in_review and reviewing to correct task status values (no coercion to in_reviewing)", () => {
    const backendFeatures = [
      makeFeatureWithTasks({
        tasks: [
          makeBackendTask({ status: "in_review" }),
          makeBackendTask({ status: "reviewing" }),
        ],
      }),
    ];

    const result = adaptFeatureWithTasksToFeatures(backendFeatures);
    for (const task of result[0].tasks) {
      expect(task.status).not.toBe("in_reviewing");
    }
  });
});

// ─── 7. Mode allowlist cross-check — rendering is consistent ─────────────────

describe("Mode allowlist consistency — status contract drives all rendering surfaces", () => {
  it("Task Mode filter keys match TASK_MODE_STATUSES exactly", () => {
    expect(getAllStatusFilterKeys()).toEqual(TASK_MODE_STATUSES);
  });

  it("Feature Mode filter keys match FEATURE_MODE_STATUSES exactly", () => {
    expect(getAllFeatureStatusFilterKeys()).toEqual(FEATURE_MODE_STATUSES);
  });

  it("STATUS_COLUMNS keys match TASK_MODE_STATUSES in order", () => {
    expect(STATUS_COLUMNS.map((c) => c.key)).toEqual(TASK_MODE_STATUSES);
  });

  it("FEATURE_STATUS_OPTIONS keys match FEATURE_MODE_STATUSES in order", () => {
    expect(FEATURE_STATUS_OPTIONS.map((o) => o.key)).toEqual(
      FEATURE_MODE_STATUSES,
    );
  });

  it("Task Mode board columns match filter allowlist — no drift between columns and filters", () => {
    const filterKeys = getAllStatusFilterKeys();
    const columnKeys = STATUS_COLUMNS.map((c) => c.key);
    expect(columnKeys).toEqual(filterKeys);
  });

  it("Feature Mode board columns match filter allowlist — no drift between columns and filters", () => {
    const filterKeys = getAllFeatureStatusFilterKeys();
    const columnKeys = FEATURE_STATUS_OPTIONS.map((o) => o.key);
    expect(columnKeys).toEqual(filterKeys);
  });
});

// ─── 8. TaskBoardView renders correct column headers from TASK_MODE_STATUSES ─

describe("TaskBoardView — column headers from TASK_MODE_STATUSES contract", () => {
  beforeEach(() => {
    mockContextRef.current = buildTaskModeContext({
      features: [
        makeFeature({ tasks: [makeTask("T1", "Sample task", "todo")] }),
      ],
    });
  });

  it("renders exactly 8 task column headers", () => {
    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    const matches = html.match(/data-task-status-header=/g) ?? [];
    expect(matches).toHaveLength(8);
  });

  it("In Review column header is present (in_review key)", () => {
    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).toContain('data-task-status-header="in_review"');
  });

  it("In Reviewing column header is present (reviewing key)", () => {
    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).toContain('data-task-status-header="reviewing"');
  });

  it("no column header for in_reviewing (non-canonical value)", () => {
    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).not.toContain('data-task-status-header="in_reviewing"');
  });

  it("no column header for review_passed, change_requested, review_incomplete", () => {
    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).not.toContain('data-task-status-header="review_passed"');
    expect(html).not.toContain('data-task-status-header="change_requested"');
    expect(html).not.toContain('data-task-status-header="review_incomplete"');
  });
});

// ─── 9. FeatureBoardView renders correct column headers from FEATURE_MODE_STATUSES ─

describe("FeatureBoardView — column headers from FEATURE_MODE_STATUSES contract", () => {
  beforeEach(() => {
    mockContextRef.current = buildFeatureModeContext({
      features: [makeFeature({ featureStatus: "in_implementation" })],
    });
  });

  it("renders exactly 8 feature column headers", () => {
    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    const matches = html.match(/data-feature-status-header=/g) ?? [];
    expect(matches).toHaveLength(8);
  });

  it("does not render any Task Mode-only column headers in Feature Mode", () => {
    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    for (const status of [
      "todo",
      "ready",
      "in_progress",
      "in_review",
      "reviewing",
      "in_reviewing",
    ]) {
      expect(html).not.toContain(`data-feature-status-header="${status}"`);
    }
  });

  it("all FEATURE_MODE_STATUSES appear as column headers", () => {
    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    for (const status of FEATURE_MODE_STATUSES) {
      expect(html).toContain(`data-feature-status-header="${status}"`);
    }
  });
});

// ─── 10. Full cross-check: Task Mode status → API params → board ─────────────

describe("Integration: Task Mode status filter → API query params pipeline", () => {
  it("TASK_MODE_STATUSES values round-trip through buildFeatureTaskParams as a CSV status param", () => {
    const statusCsv = TASK_MODE_STATUSES.join(",");
    const sp = buildFeatureTaskParams({ status: statusCsv });
    const returned = sp.get("status") ?? "";
    for (const status of TASK_MODE_STATUSES) {
      expect(returned).toContain(status);
    }
  });

  it("Non-canonical in_reviewing is NOT present in any TASK_MODE API params", () => {
    const statusCsv = TASK_MODE_STATUSES.join(",");
    const sp = buildFeatureTaskParams({ status: statusCsv });
    expect(sp.get("status") ?? "").not.toContain("in_reviewing");
  });

  it("API params always include include=tasks regardless of status filter", () => {
    for (const status of TASK_MODE_STATUSES) {
      const sp = buildFeatureTaskParams({ status });
      expect(sp.get("include")).toBe("tasks");
    }
  });

  it("Status filter and board columns have identical key sets", () => {
    const filterKeys = new Set(getAllStatusFilterKeys());
    const columnKeys = new Set(STATUS_COLUMNS.map((c) => c.key));
    expect(filterKeys).toEqual(columnKeys);
  });
});
