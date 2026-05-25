/**
 * Regression tests for TaskBoardView prop pass-throughs.
 *
 * Verifies that TaskBoardView correctly wires:
 *   - toggleFeature (feature expansion) — expandedFeatureIds drives aria-expanded on FeatureRow
 *   - setSelectedTask (task detail selection) — task cards are rendered for expanded rows
 *     and the callback is not spuriously called during rendering
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedFeature } from "../services/yaml-parser";
import type { ActiveFilters, FeatureActiveFilters } from "../features/board/types";

// ─── Board context mock ────────────────────────────────────────────────────────

const mockToggleFeature = vi.hoisted(() => vi.fn());
const mockSetSelectedTask = vi.hoisted(() => vi.fn());

// Mutable ref so individual tests can override context values.
const mockContextRef = vi.hoisted(() => ({
  current: null as unknown,
}));

vi.mock("../features/board/components/KanbanBoard/KanbanBoard.context", () => ({
  useBoardContext: () => mockContextRef.current,
}));

import { TaskBoardView } from "../features/board/components/TaskBoardView/TaskBoardView";

// ─── Context factory ──────────────────────────────────────────────────────────

function buildContext(opts: {
  features?: ParsedFeature[];
  expandedFeatureIds?: Set<string>;
  taskSearchQuery?: string;
  taskActiveFilters?: ActiveFilters;
}) {
  const taskFilters: ActiveFilters = opts.taskActiveFilters ?? { statuses: [] };
  const featureFilters: FeatureActiveFilters = { statuses: [] };

  return {
    workspace: {
      id: "test-ws",
      owner: "test-owner",
      repo: "test-repo",
      name: "Test Workspace",
      isPrivate: false,
      connectedAt: "2026-01-01T00:00:00Z",
    },
    features: opts.features ?? [],
    trackedFeatures: [],
    loading: false,
    error: null,
    reload: vi.fn(),
    boardMode: "task" as const,
    setBoardMode: vi.fn(),
    taskSearchQuery: opts.taskSearchQuery ?? "",
    setTaskSearchQuery: vi.fn(),
    taskActiveFilters: taskFilters,
    setTaskActiveFilters: vi.fn(),
    featureSearchQuery: "",
    setFeatureSearchQuery: vi.fn(),
    featureActiveFilters: featureFilters,
    setFeatureActiveFilters: vi.fn(),
    // Legacy aliases
    searchQuery: opts.taskSearchQuery ?? "",
    setSearchQuery: vi.fn(),
    activeFilters: taskFilters,
    setActiveFilters: vi.fn(),
    expandedFeatureIds: opts.expandedFeatureIds ?? new Set<string>(),
    toggleFeature: mockToggleFeature,
    selectedTask: null,
    setSelectedTask: mockSetSelectedTask,
    selectedFeature: null,
    setSelectedFeature: vi.fn(),
    syncing: false,
    syncError: null,
    syncBoard: vi.fn(),
    backendTaskResults: null as import("../services/yaml-parser").ParsedFeature[] | null,
    backendFeatureResults: null as import("../services/yaml-parser").ParsedFeature[] | null,
    taskSearching: false,
    featureSearching: false,
    taskSearchError: null,
    featureSearchError: null,
    workspaceDetail: {
      id: "test-ws",
      name: "Test Workspace",
      slug: "test-ws",
      repo_url: "https://github.com/test/repo",
      source_state: { stale: false },
      updated_at: "2026-01-01T00:00:00Z",
      features: [],
      tasks: [],
    },
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

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeFeature(overrides: Partial<ParsedFeature> = {}): ParsedFeature {
  return {
    id: "alpha-feature",
    title: "Alpha Feature",
    featureStatus: "in_implementation",
    tasks: [],
    ...overrides,
  };
}

function makeTask(id: string, title: string, status: string) {
  return { id, title, status, dependsOn: [] };
}

beforeEach(() => {
  mockToggleFeature.mockClear();
  mockSetSelectedTask.mockClear();
});

// ─── Feature expansion wiring ─────────────────────────────────────────────────

describe("TaskBoardView — feature expansion wiring (toggleFeature)", () => {
  it("renders FeatureRow with aria-expanded=false when feature is not in expandedFeatureIds", () => {
    mockContextRef.current = buildContext({
      features: [makeFeature()],
      expandedFeatureIds: new Set<string>(),
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).toContain('aria-expanded="false"');
  });

  it("renders FeatureRow with aria-expanded=true when feature id is in expandedFeatureIds", () => {
    mockContextRef.current = buildContext({
      features: [makeFeature()],
      expandedFeatureIds: new Set<string>(["alpha-feature"]),
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).toContain('aria-expanded="true"');
  });

  it("each feature gets independent expansion state from expandedFeatureIds", () => {
    mockContextRef.current = buildContext({
      features: [
        makeFeature({ id: "feat-a", title: "Feature A" }),
        makeFeature({ id: "feat-b", title: "Feature B" }),
      ],
      expandedFeatureIds: new Set<string>(["feat-a"]), // only feat-a is expanded
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    // One row expanded, one collapsed
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-expanded="false"');
  });

  it("toggleFeature from context is not called during rendering", () => {
    mockContextRef.current = buildContext({ features: [makeFeature()] });

    renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(mockToggleFeature).not.toHaveBeenCalled();
  });
});

// ─── Task detail selection wiring ─────────────────────────────────────────────

describe("TaskBoardView — task detail selection wiring (setSelectedTask)", () => {
  it("renders task cards inside an expanded feature row, confirming onSelectTask is wired", () => {
    const feature = makeFeature({
      tasks: [makeTask("T1", "Setup OAuth providers", "todo")],
    });

    mockContextRef.current = buildContext({
      features: [feature],
      expandedFeatureIds: new Set<string>(["alpha-feature"]),
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).toContain("Setup OAuth providers");
    expect(html).toContain('data-task-id="T1"');
  });

  it("task cards are not rendered when the feature row is collapsed", () => {
    const feature = makeFeature({
      tasks: [makeTask("T1", "Unique task title ZXQWERTY9342", "todo")],
    });

    mockContextRef.current = buildContext({
      features: [feature],
      expandedFeatureIds: new Set<string>(), // collapsed
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).not.toContain("Unique task title ZXQWERTY9342");
  });

  it("setSelectedTask from context is not called during rendering", () => {
    mockContextRef.current = buildContext({
      features: [makeFeature({ tasks: [makeTask("T1", "Some task", "todo")] })],
      expandedFeatureIds: new Set<string>(["alpha-feature"]),
    });

    renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(mockSetSelectedTask).not.toHaveBeenCalled();
  });

  it("multiple tasks in an expanded feature row are all rendered", () => {
    const feature = makeFeature({
      tasks: [
        makeTask("T1", "First task title", "todo"),
        makeTask("T2", "Second task title", "in_progress"),
      ],
    });

    mockContextRef.current = buildContext({
      features: [feature],
      expandedFeatureIds: new Set<string>(["alpha-feature"]),
    });

    const html = renderToStaticMarkup(React.createElement(TaskBoardView));
    expect(html).toContain("First task title");
    expect(html).toContain("Second task title");
  });
});
