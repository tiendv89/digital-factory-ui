import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/board",
}));

const mockBoardContext = vi.hoisted(() => ({
  workspaceDetail: {
    id: "ws-1",
    name: "Test Workspace",
    slug: "test-workspace",
    source_state: { stale: false },
    updated_at: "2026-06-09T00:00:00Z",
    features: [],
    tasks: [],
  },
  features: [],
  loading: false,
  error: null,
  boardMode: "feature" as const,
  viewMode: "kanban" as const,
  setViewMode: vi.fn(),
  setBoardMode: vi.fn(),
  taskSearchQuery: "",
  setTaskSearchQuery: vi.fn(),
  featureSearchQuery: "",
  setFeatureSearchQuery: vi.fn(),
  taskActiveFilters: { statuses: [] },
  featureActiveFilters: { statuses: [] },
  setTaskActiveFilters: vi.fn(),
  setFeatureActiveFilters: vi.fn(),
  backendTaskResults: null,
  backendFeatureResults: null,
  taskSearching: false,
  featureSearching: false,
  taskSearchError: null,
  featureSearchError: null,
  syncError: null,
  trackedFeatures: [],
  syncing: false,
  syncBoard: vi.fn(),
  reload: vi.fn(),
  openTaskTab: vi.fn(),
  openTaskTabNewSession: vi.fn(),
  openFeatureTab: vi.fn(),
  openFeatureTabNewSession: vi.fn(),
  expandedFeatureIds: new Set<string>(),
  toggleFeature: vi.fn(),
  taskPage: 1,
  setTaskPage: vi.fn(),
  featurePage: 1,
  setFeaturePage: vi.fn(),
  taskPagination: null,
  featurePagination: null,
  taskLimit: 25,
  setTaskLimit: vi.fn(),
  featureLimit: 25,
  setFeatureLimit: vi.fn(),
  searchQuery: "",
  setSearchQuery: vi.fn(),
  activeFilters: { statuses: [] },
  setActiveFilters: vi.fn(),
}));

vi.mock(
  "../features/board/components/KanbanBoard/KanbanBoard.context",
  () => ({
    useBoardContext: () => mockBoardContext,
    BoardProvider: ({ children }: { children: React.ReactNode }) => children,
  }),
);

vi.mock(
  "../features/board/components/TaskBoardView",
  () => ({
    TaskBoardView: () =>
      React.createElement("div", { "data-task-board-view": true }),
  }),
);

vi.mock(
  "../features/board/components/FeatureBoardView",
  () => ({
    FeatureBoardView: () =>
      React.createElement("div", { "data-feature-board-view": true }),
  }),
);

vi.mock(
  "../features/board/components/FeatureHierarchyListView",
  () => ({
    FeatureHierarchyListView: () =>
      React.createElement("div", { "data-feature-hierarchy-list": true }),
  }),
);

vi.mock(
  "../features/board/components/BoardTableTitle/BoardTableTitle",
  () => ({
    BoardTableTitle: () =>
      React.createElement("div", { "data-board-table-title": true }),
  }),
);

import { KanbanBoard } from "../features/board/components/KanbanBoard/KanbanBoard";

describe("KanbanBoard view mode toggle", () => {
  beforeEach(() => {
    mockBoardContext.viewMode = "kanban";
    mockBoardContext.boardMode = "feature";
  });

  it("renders the view mode toggle buttons", () => {
    const html = renderToStaticMarkup(React.createElement(KanbanBoard));
    expect(html).toContain('data-view-mode-btn="kanban"');
    expect(html).toContain('data-view-mode-btn="list"');
  });

  it("renders FeatureBoardView in kanban mode with feature boardMode", () => {
    mockBoardContext.viewMode = "kanban";
    mockBoardContext.boardMode = "feature";
    const html = renderToStaticMarkup(React.createElement(KanbanBoard));
    expect(html).toContain("data-feature-board-view");
    expect(html).not.toContain("data-feature-hierarchy-list");
  });

  it("renders TaskBoardView in kanban mode with task boardMode", () => {
    mockBoardContext.viewMode = "kanban";
    mockBoardContext.boardMode = "task";
    const html = renderToStaticMarkup(React.createElement(KanbanBoard));
    expect(html).toContain("data-task-board-view");
    expect(html).not.toContain("data-feature-hierarchy-list");
  });

  it("renders FeatureHierarchyListView in list mode", () => {
    mockBoardContext.viewMode = "list";
    const html = renderToStaticMarkup(React.createElement(KanbanBoard));
    expect(html).toContain("data-feature-hierarchy-list");
    expect(html).not.toContain("data-feature-board-view");
    expect(html).not.toContain("data-task-board-view");
  });

  it("renders kanban board with data-kanban-board attribute", () => {
    const html = renderToStaticMarkup(React.createElement(KanbanBoard));
    expect(html).toContain("data-kanban-board");
  });
});
