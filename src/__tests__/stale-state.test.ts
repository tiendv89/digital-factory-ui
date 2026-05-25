/**
 * Tests for stale-source state, retryable error affordances, and empty states.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ParsedFeature } from "../services/yaml-parser";
import type { ActiveFilters, BoardLoadError, FeatureActiveFilters } from "../features/board/types";
import type { WorkspaceDetail } from "../services/workflow-backend/types";

// ─── Board context mock ────────────────────────────────────────────────────────

const mockContextRef = vi.hoisted(() => ({
  current: null as unknown,
}));

vi.mock("../features/board/components/KanbanBoard/KanbanBoard.context", () => ({
  useBoardContext: () => mockContextRef.current,
}));

import { TaskBoardView } from "../features/board/components/TaskBoardView/TaskBoardView";
import { FeatureBoardView } from "../features/board/components/FeatureBoardView/FeatureBoardView";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWorkspaceDetail(overrides: Partial<WorkspaceDetail> = {}): WorkspaceDetail {
  return {
    id: "ws-1",
    name: "Test WS",
    slug: "test-ws",
    repo_url: "https://github.com/test/test",
    source_state: { stale: false },
    updated_at: "2026-01-01T00:00:00Z",
    features: [],
    tasks: [],
    ...overrides,
  };
}

function makeFeature(id: string): ParsedFeature {
  return {
    id,
    title: `Feature ${id}`,
    featureStatus: "in_implementation",
    tasks: [],
  };
}

function buildTaskContext(opts: {
  features?: ParsedFeature[];
  loading?: boolean;
  error?: BoardLoadError | null;
  taskSearchQuery?: string;
  taskActiveFilters?: ActiveFilters;
}) {
  return {
    features: opts.features ?? [],
    trackedFeatures: [],
    loading: opts.loading ?? false,
    error: opts.error ?? null,
    reload: vi.fn(),
    syncing: false,
    syncError: null,
    syncBoard: vi.fn(),
    boardMode: "task" as const,
    setBoardMode: vi.fn(),
    taskSearchQuery: opts.taskSearchQuery ?? "",
    setTaskSearchQuery: vi.fn(),
    taskActiveFilters: opts.taskActiveFilters ?? { statuses: [] },
    setTaskActiveFilters: vi.fn(),
    featureSearchQuery: "",
    setFeatureSearchQuery: vi.fn(),
    featureActiveFilters: { statuses: [] } as FeatureActiveFilters,
    setFeatureActiveFilters: vi.fn(),
    searchQuery: opts.taskSearchQuery ?? "",
    setSearchQuery: vi.fn(),
    activeFilters: opts.taskActiveFilters ?? { statuses: [] },
    setActiveFilters: vi.fn(),
    expandedFeatureIds: new Set<string>(),
    toggleFeature: vi.fn(),
    selectedTask: null,
    setSelectedTask: vi.fn(),
    selectedFeature: null,
    setSelectedFeature: vi.fn(),
    backendTaskResults: null as ParsedFeature[] | null,
    backendFeatureResults: null as ParsedFeature[] | null,
    taskSearching: false,
    featureSearching: false,
    taskSearchError: null,
    featureSearchError: null,
    workspaceDetail: makeWorkspaceDetail(),
    openTaskTab: vi.fn(),
    openTaskTabNewSession: vi.fn(),
    openFeatureTab: vi.fn(),
    openFeatureTabNewSession: vi.fn(),
    // Pagination
    featurePage: 1,
    taskPage: 1,
    setFeaturePage: vi.fn(),
    setTaskPage: vi.fn(),
    featurePageInfo: null,
    taskPageInfo: null,
  };
}

// ─── Stale state tests ────────────────────────────────────────────────────────

describe("TaskBoardView — stale state and retryable errors", () => {
  it("renders empty board state when features list is empty", () => {
    mockContextRef.current = buildTaskContext({ features: [] });
    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).toContain("No Features Yet");
  });

  it("renders search empty state when backend returns empty results", () => {
    mockContextRef.current = {
      ...buildTaskContext({ features: [makeFeature("alpha")] }),
      backendTaskResults: [],
    };
    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).toContain("No tasks match");
  });

  it("renders network error with retry button when retryable is true", () => {
    const error: BoardLoadError = {
      kind: "network_error",
      message: "Gateway timeout",
      retryable: true,
    };
    mockContextRef.current = buildTaskContext({ error });
    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).toContain("Network Error");
    expect(html).toContain("Retry");
  });

  it("renders network error without retry button when retryable is false", () => {
    const error: BoardLoadError = {
      kind: "network_error",
      message: "Not permitted",
      retryable: false,
    };
    mockContextRef.current = buildTaskContext({ error });
    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).toContain("Network Error");
    expect(html).not.toContain("Retry");
  });

  it("shows searching state when taskSearching is true", () => {
    mockContextRef.current = {
      ...buildTaskContext({ features: [makeFeature("alpha")] }),
      taskSearching: true,
    };
    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).toContain("Searching");
  });

  it("uses backend task results when backendTaskResults is a non-null array", () => {
    const backendResults: ParsedFeature[] = [makeFeature("backend-feature")];
    mockContextRef.current = {
      ...buildTaskContext({
        features: [makeFeature("alpha"), makeFeature("beta")],
      }),
      backendTaskResults: backendResults,
    };
    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    // backend-feature id should be present (FeatureRow renders feature.id)
    expect(html).toContain("backend-feature");
    // local features should NOT appear (backend results replace them)
    expect(html).not.toContain(">alpha<");
    expect(html).not.toContain(">beta<");
  });
});

describe("FeatureBoardView — stale state and retryable errors", () => {
  it("renders empty board state when features list is empty", () => {
    const ctx = {
      ...buildTaskContext({ features: [] }),
      boardMode: "feature" as const,
    };
    mockContextRef.current = ctx;
    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    expect(html).toContain("No Features Yet");
  });

  it("renders search empty state when backend returns empty feature results", () => {
    mockContextRef.current = {
      ...buildTaskContext({ features: [makeFeature("alpha")] }),
      boardMode: "feature" as const,
      backendFeatureResults: [],
    };
    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    expect(html).toContain("No features match");
  });

  it("renders network error with retry when retryable is true (feature mode)", () => {
    const error: BoardLoadError = {
      kind: "network_error",
      message: "Adapter timeout",
      retryable: true,
    };
    mockContextRef.current = {
      ...buildTaskContext({ error }),
      boardMode: "feature" as const,
    };
    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    expect(html).toContain("Network Error");
    expect(html).toContain("Retry");
  });

  it("shows searching state when featureSearching is true", () => {
    mockContextRef.current = {
      ...buildTaskContext({ features: [makeFeature("alpha")] }),
      boardMode: "feature" as const,
      featureSearching: true,
    };
    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    expect(html).toContain("Searching");
  });
});
