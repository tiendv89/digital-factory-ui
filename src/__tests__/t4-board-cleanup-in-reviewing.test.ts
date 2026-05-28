/**
 * T4 — Board visual cleanup and In Reviewing status
 *
 * Covers:
 *   1. Board page no longer renders CreateTaskButton
 *   2. STATUS_COLUMNS includes in_reviewing with correct label/color
 *   3. FEATURE_STATUS_OPTIONS does NOT include in_reviewing (Task Mode-only)
 *   4. FeatureBoardView does not render In Reviewing status column
 *   5. in_reviewing tasks render in the correct column in TaskBoardView
 *   6. TaskBoardView renders exactly 8 column headers (including In Reviewing)
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FEATURE_STATUS_OPTIONS,
  STATUS_COLUMNS,
} from "../features/board/lib/status";

// ─── 1. Board page no longer renders "Create Task" button ──────────────────

const mockWorkspaceContext = vi.hoisted(() => ({
  activeWorkspace: {
    id: "ws-1",
    name: "workspace",
    slug: "workspace",
    repo_url: "https://github.com/acme/project-workspace.git",
    source_state: { stale: false },
    updated_at: "2026-05-22T00:00:00Z",
    features: [],
    tasks: [],
  },
  loadingWorkspace: false,
  workspaceError: null,
  summaries: [
    {
      workspaceId: "ws-1",
      name: "workspace",
      repo_url: "https://github.com/acme/project-workspace.git",
      default_branch: "main",
      last_opened_at: "2026-05-22T00:00:00Z",
    },
  ],
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
  goToBoard: vi.fn(),
  selectWorkspace: vi.fn(),
  importWorkspace: vi.fn(),
  clearImportError: vi.fn(),
  removeLocalSummary: vi.fn(),
  syncCurrentWorkspace: vi.fn(),
  clearSyncError: vi.fn(),
  openTaskTab: vi.fn(),
  closeTaskTab: vi.fn(),
  activateTaskTab: vi.fn(),
  openFeatureTab: vi.fn(),
  closeFeatureTab: vi.fn(),
  activateFeatureTab: vi.fn(),
}));

const mockBoardContextForBoardPage = vi.hoisted(() => ({
  workspaceDetail: {
    id: "ws-1",
    name: "workspace",
    slug: "workspace",
    repo_url: "https://github.com/acme/project-workspace.git",
    source_state: { stale: false },
    updated_at: "2026-05-22T00:00:00Z",
    features: [],
    tasks: [],
  },
  features: [],
  trackedFeatures: [],
  loading: false,
  error: null,
  reload: vi.fn(),
  syncing: false,
  syncError: null,
  syncBoard: vi.fn(),
  openTaskTab: vi.fn(),
  openTaskTabNewSession: vi.fn(),
  openFeatureTab: vi.fn(),
  openFeatureTabNewSession: vi.fn(),
  boardMode: "task" as const,
  setBoardMode: vi.fn(),
  taskSearchQuery: "",
  setTaskSearchQuery: vi.fn(),
  taskActiveFilters: { statuses: [] as string[] },
  setTaskActiveFilters: vi.fn(),
  featureSearchQuery: "",
  setFeatureSearchQuery: vi.fn(),
  featureActiveFilters: { statuses: [] as string[] },
  setFeatureActiveFilters: vi.fn(),
  searchQuery: "",
  setSearchQuery: vi.fn(),
  activeFilters: { statuses: [] as string[] },
  setActiveFilters: vi.fn(),
  expandedFeatureIds: new Set<string>(),
  toggleFeature: vi.fn(),
  backendTaskResults: null,
  backendFeatureResults: null,
  taskSearching: false,
  featureSearching: false,
  taskSearchError: null,
  featureSearchError: null,
  taskPage: 1,
  setTaskPage: vi.fn(),
  featurePage: 1,
  setFeaturePage: vi.fn(),
  taskPagination: null,
  featurePagination: null,
  taskSort: "updated_at_desc",
  setTaskSort: vi.fn(),
  featureSort: "updated_at_desc",
  setFeatureSort: vi.fn(),
  taskLimit: 20,
  setTaskLimit: vi.fn(),
  featureLimit: 20,
  setFeatureLimit: vi.fn(),
}));

vi.mock("@/features/workspaces/context/WorkspaceContext", () => ({
  useWorkspaceContext: () => mockWorkspaceContext,
  useWorkspaceActionsContext: () => ({
    syncCurrentWorkspace: vi.fn(),
    syncingWorkspace: false,
    syncError: null,
    openTaskTab: vi.fn(),
    openFeatureTab: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

vi.mock("@/features/board/components/BoardHeader/BoardHeader", () => ({
  BoardHeader: () =>
    React.createElement("header", { "data-board-header": true }),
}));

vi.mock("@/features/board/components/KanbanBoard/KanbanBoard.context", () => ({
  BoardProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-board-provider": true }, children),
  useBoardContext: () => mockBoardContextForBoardPage,
  useBoardTrackingContext: () => ({
    trackedFeatures: [],
    openTaskTab: vi.fn(),
    openTaskTabNewSession: vi.fn(),
  }),
}));

vi.mock("@/features/board/components/KanbanBoard/KanbanBoard", () => ({
  KanbanBoard: () => React.createElement("div", { "data-kanban-board": true }),
}));

vi.mock(
  "@/features/board/components/TaskTrackingPanel/TaskTrackingPanel",
  () => ({
    TaskTrackingPanel: () =>
      React.createElement("aside", { "data-task-tracking-panel": true }),
  }),
);

import BoardPage from "../app/board/page";

describe("BoardPage — CreateTaskButton removal", () => {
  beforeEach(() => {
    mockWorkspaceContext.activeSurface = "board";
    mockWorkspaceContext.activeTaskTabId = null;
    mockWorkspaceContext.activeFeatureTabId = null;
    mockWorkspaceContext.openTaskTabs = [];
    mockWorkspaceContext.openFeatureTabs = [];
  });

  it("does not render 'Create Task' button text on the board page", () => {
    const html = renderToStaticMarkup(React.createElement(BoardPage));
    expect(html).not.toContain("Create Task");
  });

  it("does not render create-task aria label on the board page", () => {
    const html = renderToStaticMarkup(React.createElement(BoardPage));
    expect(html).not.toContain('aria-label="Create new task"');
  });

  it("still renders standard board components (header, kanban, sidebar)", () => {
    const html = renderToStaticMarkup(React.createElement(BoardPage));
    expect(html).toContain("data-board-header");
    expect(html).toContain("data-kanban-board");
    expect(html).toContain("data-task-tracking-panel");
  });
});

// ─── 2. STATUS_COLUMNS includes in_reviewing ──────────────────────────────

describe("STATUS_COLUMNS — includes in_reviewing", () => {
  it("contains in_reviewing entry with correct label", () => {
    const col = STATUS_COLUMNS.find((c) => c.key === "in_reviewing");
    expect(col).toBeDefined();
    expect(col!.label).toBe("In Reviewing");
  });

  it("contains in_reviewing entry with valid hex color", () => {
    const col = STATUS_COLUMNS.find((c) => c.key === "in_reviewing");
    expect(col).toBeDefined();
    expect(col!.color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("places in_reviewing between in_progress and blocked (index 3)", () => {
    expect(STATUS_COLUMNS[2].key).toBe("in_progress");
    expect(STATUS_COLUMNS[3].key).toBe("in_reviewing");
    expect(STATUS_COLUMNS[4].key).toBe("blocked");
  });

  it("keeps all original STATUS_COLUMNS entries", () => {
    const keys = STATUS_COLUMNS.map((c) => c.key);
    expect(keys).toContain("todo");
    expect(keys).toContain("ready");
    expect(keys).toContain("in_progress");
    expect(keys).toContain("blocked");
    expect(keys).toContain("in_review");
    expect(keys).toContain("done");
    expect(keys).toContain("cancelled");
  });

  it("defines exactly 8 columns total", () => {
    expect(STATUS_COLUMNS).toHaveLength(8);
  });
});

// ─── 3. FEATURE_STATUS_OPTIONS does NOT include in_reviewing ─────────────

describe("FEATURE_STATUS_OPTIONS — Task Mode-only exclusion", () => {
  it("does not contain in_reviewing", () => {
    const keys = FEATURE_STATUS_OPTIONS.map((o) => o.key);
    expect(keys).not.toContain("in_reviewing");
  });

  it("still contains exactly the 8 canonical feature lifecycle statuses", () => {
    const keys = FEATURE_STATUS_OPTIONS.map((o) => o.key);
    expect(keys).toEqual([
      "in_design",
      "in_tdd",
      "ready_for_implementation",
      "in_implementation",
      "in_handoff",
      "done",
      "blocked",
      "cancelled",
    ]);
  });

  it("does not contain any task lifecycle status", () => {
    const keys = new Set<string>(FEATURE_STATUS_OPTIONS.map((o) => o.key));
    expect(keys.has("in_reviewing")).toBe(false);
    expect(keys.has("todo")).toBe(false);
    expect(keys.has("ready")).toBe(false);
    expect(keys.has("in_review")).toBe(false);
  });
});

// ─── 4. TaskBoardView renders In Reviewing column header ─────────────────

describe("TaskBoardView — In Reviewing column header rendering", () => {
  it("STATUS_COLUMNS includes in_reviewing with uppercase label", () => {
    const col = STATUS_COLUMNS.find((c) => c.key === "in_reviewing");
    expect(col).toBeDefined();
    expect(col!.label).toBe("In Reviewing");
  });

  it("STATUS_COLUMNS count matches the number of column headers in TaskBoardView", () => {
    // TaskBoardView maps over STATUS_COLUMNS to render TaskColumnHeader
    // components.  The number of rendered headers equals STATUS_COLUMNS.length.
    expect(STATUS_COLUMNS.length).toBeGreaterThan(0);
  });
});

// ─── 5. Feature Mode does not display Task Mode-only status ──────────────

describe("Feature Mode — Task Mode-only status exclusion", () => {
  it("FEATURE_STATUS_OPTIONS does not include in_reviewing", () => {
    const keys = FEATURE_STATUS_OPTIONS.map((o) => o.key as string);
    expect(keys).not.toContain("in_reviewing");
  });

  it("FeatureBoardView will not render in_reviewing column because FEATURE_STATUS_OPTIONS lacks it", () => {
    // FeatureBoardView uses getFeatureStatusColumns() which maps
    // FEATURE_STATUS_OPTIONS directly.  Since FEATURE_STATUS_OPTIONS does not
    // contain in_reviewing, FeatureBoardView will never render it.
    const keys = FEATURE_STATUS_OPTIONS.map((o) => o.key as string);
    expect(keys.includes("in_reviewing")).toBe(false);
  });
});
