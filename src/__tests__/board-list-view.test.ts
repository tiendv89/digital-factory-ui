import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/board",
}));

const mockBoardContext = vi.hoisted(() => ({
  features: [
    {
      id: "ui-revamp",
      title: "UI Revamp",
      featureStatus: "in_implementation",
      tasks: [
        {
          id: "T3",
          title: "Board reskin",
          status: "in_progress",
          dependsOn: [],
          branch: "feature/ui-revamp-T3",
        },
        {
          id: "T4",
          title: "Feature IDE",
          status: "ready",
          dependsOn: ["T3"],
          branch: "feature/ui-revamp-T4",
        },
      ],
    },
    {
      id: "auth-service",
      title: "Auth Service",
      featureStatus: "in_design",
      tasks: [] as Array<{ id: string; title: string; status: string; dependsOn: string[] }>,
    },
  ],
  loading: false,
  error: null as null | { kind: string; message: string; retryable?: boolean },
  backendFeatureResults: null as Array<{ id: string; title: string; featureStatus: string; tasks: Array<{ id: string; title: string; status: string; dependsOn: string[] }> }> | null,
  backendTaskResults: null as Array<{ id: string; title: string; featureStatus: string; tasks: Array<{ id: string; title: string; status: string; dependsOn: string[] }> }> | null,
  featureSearching: false,
  taskSearching: false,
  featureSearchError: null as null | { kind: string; message: string; retryable?: boolean },
  taskSearchError: null as null | { kind: string; message: string; retryable?: boolean },
  boardMode: "feature" as "feature" | "task",
  viewMode: "list" as "list" | "kanban",
  openTaskTab: vi.fn(),
  openFeatureTab: vi.fn(),
  setFeaturePage: vi.fn(),
  setTaskPage: vi.fn(),
  featurePagination: null,
  taskPagination: null,
  setFeatureLimit: vi.fn(),
  setTaskLimit: vi.fn(),
}));

vi.mock(
  "../features/board/components/KanbanBoard/KanbanBoard.context",
  () => ({
    useBoardContext: () => mockBoardContext,
  }),
);

import { FeatureHierarchyListView } from "../features/board/components/FeatureHierarchyListView/FeatureHierarchyListView";

describe("FeatureHierarchyListView", () => {
  beforeEach(() => {
    mockBoardContext.loading = false;
    mockBoardContext.error = null;
    mockBoardContext.backendFeatureResults = null;
    mockBoardContext.backendTaskResults = null;
    mockBoardContext.featureSearching = false;
    mockBoardContext.featurePagination = null;
  });

  it("renders a table with feature rows", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureHierarchyListView),
    );
    expect(html).toContain("data-feature-hierarchy-list");
    expect(html).toContain('data-list-feature-row="ui-revamp"');
    expect(html).toContain('data-list-feature-row="auth-service"');
  });

  it("renders feature titles in feature rows", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureHierarchyListView),
    );
    expect(html).toContain("UI Revamp");
    expect(html).toContain("Auth Service");
  });

  it("renders feature status badges", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureHierarchyListView),
    );
    expect(html).toContain('data-feature-status-badge="in_implementation"');
    expect(html).toContain('data-feature-status-badge="in_design"');
  });

  it("renders a loading state when loading", () => {
    mockBoardContext.loading = true;
    const html = renderToStaticMarkup(
      React.createElement(FeatureHierarchyListView),
    );
    expect(html).toContain("Loading features");
    expect(html).not.toContain("data-feature-hierarchy-list");
  });

  it("shows search loading state when searching", () => {
    mockBoardContext.featureSearching = true;
    const html = renderToStaticMarkup(
      React.createElement(FeatureHierarchyListView),
    );
    expect(html).toContain("Searching");
  });

  it("shows empty board state when no features", () => {
    const origFeatures = mockBoardContext.features;
    mockBoardContext.features = [];
    const html = renderToStaticMarkup(
      React.createElement(FeatureHierarchyListView),
    );
    // Should render empty board state (not the list)
    expect(html).not.toContain("data-feature-hierarchy-list");
    mockBoardContext.features = origFeatures;
  });

  it("uses backend search results when available", () => {
    mockBoardContext.backendFeatureResults = [
      {
        id: "search-result",
        title: "Search Result Feature",
        featureStatus: "in_design",
        tasks: [] as Array<{ id: string; title: string; status: string; dependsOn: string[] }>,
      },
    ];
    const html = renderToStaticMarkup(
      React.createElement(FeatureHierarchyListView),
    );
    expect(html).toContain('data-list-feature-row="search-result"');
    expect(html).not.toContain('data-list-feature-row="ui-revamp"');
    mockBoardContext.backendFeatureResults = null;
  });
});
