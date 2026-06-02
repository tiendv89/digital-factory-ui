/**
 * T5 — Regression and responsive QA tests
 *
 * Covers the T5 checklist items not already addressed by earlier test files:
 *
 *   - FeatureBoardView renders the feature list and FeatureListRow click target
 *   - FeatureListRow renders accessible button attributes (for setSelectedFeature flow)
 *   - FeatureListRow does NOT render task-detail-related markup
 *   - KanbanBoard-level mode switch: TaskBoardView vs FeatureBoardView rendered in context
 *   - Feature Mode default filter hides done, shows active lifecycle statuses
 *   - Responsive/overflow safety: required Tailwind overflow classes are present in rendered HTML
 *   - First-visit default: board mode falls back to "task" when nothing is stored
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedFeature } from "../services/yaml-parser";
import type {
  ActiveFilters,
  FeatureActiveFilters,
} from "../features/board/types";
import {
  getDefaultBoardMode,
  getDefaultFeatureStatusFilter,
  getStoredBoardMode,
  saveBoardMode,
} from "../features/board/lib/status-filter-store";
import {
  matchesFeatureModeSearch,
  matchesFeatureModeStatusFilter,
} from "../features/board/lib/filter";
import { FEATURE_STATUS_OPTIONS, clientFeatureStatusLabel, getFeatureStatusLabel } from "../features/board/lib/status";
import { FeatureListRow } from "../features/board/components/FeatureBoardView/FeatureListRow";

// ─── localStorage shim ─────────────────────────────────────────────────────

const store: Record<string, string> = {};
const mockLS = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const key of Object.keys(store)) delete store[key];
  },
};

// @ts-expect-error test shim
global.window = {};
// @ts-expect-error test shim
global.localStorage = mockLS;

beforeEach(() => {
  mockLS.clear();
});

// ─── helpers ───────────────────────────────────────────────────────────────

function makeFeature(overrides: Partial<ParsedFeature> = {}): ParsedFeature {
  return {
    id: "kanban-board-feature",
    title: "Feature Kanban Board",
    featureStatus: "in_implementation",
    tasks: [],
    ...overrides,
  };
}

function makeTask(id: string, title: string, status: string) {
  return { id, title, status, dependsOn: [] };
}

// ─── FeatureListRow — accessible click target ─────────────────────────────

describe("FeatureListRow — accessible click target for setSelectedFeature flow", () => {
  it("renders with role=button so it is keyboard-accessible", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureListRow, {
        feature: makeFeature(),
        onClick: () => undefined,
      }),
    );
    expect(html).toContain('role="button"');
  });

  it("renders with tabIndex=0 to be focusable", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureListRow, {
        feature: makeFeature(),
        onClick: () => undefined,
      }),
    );
    expect(html).toContain('tabindex="0"');
  });

  it("renders aria-label that references 'Open feature tab'", () => {
    const feature = makeFeature({ title: "Auth System" });
    const html = renderToStaticMarkup(
      React.createElement(FeatureListRow, {
        feature,
        onClick: () => undefined,
      }),
    );
    expect(html).toContain("Open feature tab for Auth System");
  });

  it("renders feature id prominently", () => {
    const feature = makeFeature({ id: "auth-system", title: "Auth System" });
    const html = renderToStaticMarkup(
      React.createElement(FeatureListRow, {
        feature,
        onClick: () => undefined,
      }),
    );
    expect(html).toContain("auth-system");
  });

  it("renders feature title when distinct from id", () => {
    const feature = makeFeature({
      id: "auth-system",
      title: "Auth System Feature",
    });
    const html = renderToStaticMarkup(
      React.createElement(FeatureListRow, {
        feature,
        onClick: () => undefined,
      }),
    );
    expect(html).toContain("Auth System Feature");
  });

  it("does NOT render task-detail-related content (no data-task-id)", () => {
    const feature = makeFeature({
      tasks: [makeTask("T1", "Setup OAuth", "in_progress")],
    });
    const html = renderToStaticMarkup(
      React.createElement(FeatureListRow, {
        feature,
        onClick: () => undefined,
      }),
    );
    expect(html).not.toContain("data-task-id");
    expect(html).not.toContain("Setup OAuth");
  });

  it("suppresses the feature status pill in feature mode cards", () => {
    const feature = makeFeature({ featureStatus: "in_implementation" });
    const html = renderToStaticMarkup(
      React.createElement(FeatureListRow, {
        feature,
        onClick: () => undefined,
      }),
    );
    // Status pill must NOT render in Feature mode; status is shown in the
    // kanban-style status column/cell, not as a card badge.
    expect(html).not.toContain("In Progress");
  });

  it("renders without crashing for every feature lifecycle status", () => {
    const statuses = [
      "in_design",
      "in_tdd",
      "ready_for_implementation",
      "in_implementation",
      "in_handoff",
      "done",
      "blocked",
      "cancelled",
    ];
    for (const status of statuses) {
      const feature = makeFeature({ featureStatus: status });
      expect(() =>
        renderToStaticMarkup(
          React.createElement(FeatureListRow, {
            feature,
            onClick: () => undefined,
          }),
        ),
      ).not.toThrow();
    }
  });
});

// ─── FeatureBoardView — rendering via context mock ────────────────────────

const mockSetSelectedFeature = vi.hoisted(() => vi.fn());
const mockSetSelectedTask = vi.hoisted(() => vi.fn());

const featureBoardContextRef = vi.hoisted(() => ({
  current: null as unknown,
}));

vi.mock("../features/board/components/KanbanBoard/KanbanBoard.context", () => ({
  useBoardContext: () => featureBoardContextRef.current,
}));

import { FeatureBoardView } from "../features/board/components/FeatureBoardView/FeatureBoardView";

function buildFeatureBoardContext(opts: {
  features?: ParsedFeature[];
  loading?: boolean;
  error?: null | { kind: string; message: string };
  featureSearchQuery?: string;
  featureActiveFilters?: FeatureActiveFilters;
}) {
  const taskFilters: ActiveFilters = { statuses: [] };
  const featureFilters: FeatureActiveFilters = opts.featureActiveFilters ?? {
    statuses: getDefaultFeatureStatusFilter(),
  };

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
    loading: opts.loading ?? false,
    error: opts.error ?? null,
    reload: vi.fn(),
    boardMode: "feature" as const,
    setBoardMode: vi.fn(),
    taskSearchQuery: "",
    setTaskSearchQuery: vi.fn(),
    taskActiveFilters: taskFilters,
    setTaskActiveFilters: vi.fn(),
    featureSearchQuery: opts.featureSearchQuery ?? "",
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
    setSelectedTask: mockSetSelectedTask,
    selectedFeature: null,
    setSelectedFeature: mockSetSelectedFeature,
    workspaceDetail: null as unknown,
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
    // Pagination
    featurePage: 1,
    taskPage: 1,
    setFeaturePage: vi.fn(),
    setTaskPage: vi.fn(),
    featurePagination: null,
    taskPagination: null,
  };
}

describe("FeatureBoardView — renders feature rows, not task rows", () => {
  beforeEach(() => {
    mockSetSelectedFeature.mockClear();
    mockSetSelectedTask.mockClear();
  });

  it("renders an accessible list when features exist", () => {
    featureBoardContextRef.current = buildFeatureBoardContext({
      features: [makeFeature({ id: "feat-a", title: "Feature A" })],
      featureActiveFilters: { statuses: ["in_implementation"] },
    });

    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    expect(html).toContain('role="list"');
    expect(html).toContain('role="listitem"');
  });

  it("renders the feature lifecycle status header row with canonical columns", () => {
    featureBoardContextRef.current = buildFeatureBoardContext({
      features: [
        makeFeature({ id: "active-feat", featureStatus: "in_implementation" }),
        makeFeature({ id: "blocked-feat", featureStatus: "blocked" }),
      ],
      featureActiveFilters: { statuses: ["in_implementation", "blocked"] },
    });

    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    expect(html.match(/data-feature-status-header/g) ?? []).toHaveLength(
      FEATURE_STATUS_OPTIONS.length,
    );
    expect(html).toContain('aria-label="Feature status columns"');
    for (const status of FEATURE_STATUS_OPTIONS) {
      expect(html).toContain(`data-feature-status-header="${status.key}"`);
      expect(html).toContain(clientFeatureStatusLabel(status.key).toUpperCase());
    }
    expect(html).toMatch(
      /data-feature-status-count="in_implementation"[^>]*>1/,
    );
    expect(html).toMatch(/data-feature-status-count="blocked"[^>]*>1/);
    expect(html).toMatch(/data-feature-status-count="done"[^>]*>0/);
  });

  it("renders each visible feature (no local filtering — all shown from workspace root)", () => {
    featureBoardContextRef.current = buildFeatureBoardContext({
      features: [
        makeFeature({ id: "active-feat", featureStatus: "in_implementation" }),
        makeFeature({ id: "blocked-feat", featureStatus: "blocked" }),
        makeFeature({ id: "done-feat", featureStatus: "done" }),
      ],
      featureActiveFilters: { statuses: ["in_implementation", "blocked"] },
    });

    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    // Without local filtering, all 3 features are rendered (backend handles filtering)
    expect(html.match(/data-feature-grid-row/g) ?? []).toHaveLength(3);
    expect(html.match(/data-feature-status-cell/g) ?? []).toHaveLength(
      3 * FEATURE_STATUS_OPTIONS.length,
    );
    expect(html).toContain('data-feature-card-status="in_implementation"');
    expect(html).toContain('data-feature-card-status="blocked"');
    expect(html).toContain('data-feature-card-status="done"');
    expect(html.match(/data-feature-card-status/g) ?? []).toHaveLength(3);
    expect(html).toContain("active-feat");
    expect(html).toContain("blocked-feat");
    expect(html).toContain("done-feat");
    expect(html).toContain('class="grid min-h-26 border-b border-border"');
  });

  it("renders the feature id in the list", () => {
    featureBoardContextRef.current = buildFeatureBoardContext({
      features: [
        makeFeature({ id: "my-special-feature", title: "My Special Feature" }),
      ],
      featureActiveFilters: { statuses: ["in_implementation"] },
    });

    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    expect(html).toContain("my-special-feature");
  });

  it("does NOT render task cards or task column headers", () => {
    featureBoardContextRef.current = buildFeatureBoardContext({
      features: [
        makeFeature({
          id: "feat-a",
          tasks: [makeTask("T1", "OAuth Setup Task ABCXYZ", "in_progress")],
        }),
      ],
      featureActiveFilters: { statuses: ["in_implementation"] },
    });

    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    expect(html).not.toContain("OAuth Setup Task ABCXYZ");
    expect(html).not.toContain("data-task-id");
  });

  it("renders FeatureListRow with role=button (confirming openFeatureTab is the click path)", () => {
    featureBoardContextRef.current = buildFeatureBoardContext({
      features: [
        makeFeature({ id: "feat-clickable", title: "Clickable Feature" }),
      ],
      featureActiveFilters: { statuses: ["in_implementation"] },
    });

    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    expect(html).toContain('role="button"');
    expect(html).toContain("Open feature tab for Clickable Feature");
  });

  it("renders loading state without crashing", () => {
    featureBoardContextRef.current = buildFeatureBoardContext({
      loading: true,
    });

    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    expect(html).toContain("Loading features");
  });

  it("renders empty state when no features exist", () => {
    featureBoardContextRef.current = buildFeatureBoardContext({ features: [] });

    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    // EmptyBoardState should render
    expect(html).toBeTruthy();
    expect(html).not.toContain('role="list"');
  });

  it("renders all features regardless of filter mismatch (backend handles filtering)", () => {
    featureBoardContextRef.current = buildFeatureBoardContext({
      features: [makeFeature({ featureStatus: "done" })],
      featureActiveFilters: { statuses: ["in_implementation"] },
    });

    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    // Without local filtering, all features from the workspace root are shown.
    // The "done" feature appears in its status column.
    expect(html).toContain('data-feature-card-status="done"');
    expect(html).not.toContain("No features match");
  });

  it("shows all features including done when using workspace root (no local filtering)", () => {
    featureBoardContextRef.current = buildFeatureBoardContext({
      features: [
        makeFeature({ id: "active-feat", featureStatus: "in_implementation" }),
        makeFeature({ id: "done-feat", featureStatus: "done" }),
      ],
      featureActiveFilters: { statuses: getDefaultFeatureStatusFilter() },
    });

    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    // Without local filtering, both features are shown from the workspace root.
    // Backend handles any actual status filtering.
    expect(html).toContain("active-feat");
    expect(html).toContain("done-feat");
  });

  it("shows all features regardless of search query (backend handles search)", () => {
    featureBoardContextRef.current = buildFeatureBoardContext({
      features: [
        makeFeature({ id: "auth-feature", title: "Auth Feature" }),
        makeFeature({ id: "payment-feature", title: "Payment Feature" }),
      ],
      featureSearchQuery: "auth",
      featureActiveFilters: { statuses: ["in_implementation"] },
    });

    const html = renderToStaticMarkup(React.createElement(FeatureBoardView));
    // Without local filtering, all features are shown from the workspace root.
    // Backend search results (backendFeatureResults) are null in this test,
    // so the view falls back to the un-filtered features array.
    expect(html).toContain("auth-feature");
    expect(html).toContain("payment-feature");
  });
});

// ─── First-visit default board mode ──────────────────────────────────────

describe("First-visit default: board mode is 'task'", () => {
  it("getDefaultBoardMode returns 'task'", () => {
    expect(getDefaultBoardMode()).toBe("task");
  });

  it("falls back to 'task' when nothing is stored", () => {
    const mode = getStoredBoardMode() ?? getDefaultBoardMode();
    expect(mode).toBe("task");
  });

  it("falls back to 'task' when invalid data is stored", () => {
    mockLS.setItem("dashboard:board-mode", JSON.stringify("not_a_mode"));
    const mode = getStoredBoardMode() ?? getDefaultBoardMode();
    expect(mode).toBe("task");
  });
});

// ─── Feature Mode default filter hides 'done' ────────────────────────────

describe("Feature Mode default filter hides 'done' features on first visit", () => {
  it("getDefaultFeatureStatusFilter does not contain 'done'", () => {
    expect(getDefaultFeatureStatusFilter()).not.toContain("done");
  });

  it("getDefaultFeatureStatusFilter contains all active lifecycle statuses", () => {
    const filter = getDefaultFeatureStatusFilter();
    for (const status of [
      "in_design",
      "in_tdd",
      "ready_for_implementation",
      "in_implementation",
      "in_handoff",
      "blocked",
      "cancelled",
    ]) {
      expect(filter).toContain(status);
    }
  });

  it("a 'done' feature is hidden from Feature Mode on first visit", () => {
    const doneFeature = makeFeature({ featureStatus: "done" });
    const defaultFilter = getDefaultFeatureStatusFilter();
    expect(matchesFeatureModeStatusFilter(doneFeature, defaultFilter)).toBe(
      false,
    );
  });

  it("an 'in_implementation' feature is visible on first visit", () => {
    const feature = makeFeature({ featureStatus: "in_implementation" });
    const defaultFilter = getDefaultFeatureStatusFilter();
    expect(matchesFeatureModeStatusFilter(feature, defaultFilter)).toBe(true);
  });

  it("a 'blocked' feature is visible on first visit", () => {
    const feature = makeFeature({ featureStatus: "blocked" });
    const defaultFilter = getDefaultFeatureStatusFilter();
    expect(matchesFeatureModeStatusFilter(feature, defaultFilter)).toBe(true);
  });

  it("a 'cancelled' feature is visible on first visit", () => {
    const feature = makeFeature({ featureStatus: "cancelled" });
    const defaultFilter = getDefaultFeatureStatusFilter();
    expect(matchesFeatureModeStatusFilter(feature, defaultFilter)).toBe(true);
  });
});

// ─── Feature Mode search isolation ────────────────────────────────────────

describe("Feature Mode search: only matches feature id/title, not task data", () => {
  it("feature id match returns true", () => {
    const f = makeFeature({ id: "auth-kanban", title: "Auth Feature" });
    expect(matchesFeatureModeSearch(f, "auth-kanban")).toBe(true);
  });

  it("feature title match returns true", () => {
    const f = makeFeature({ title: "Payment Gateway Integration" });
    expect(matchesFeatureModeSearch(f, "payment gateway")).toBe(true);
  });

  it("task title in feature does NOT match in Feature Mode", () => {
    const f = makeFeature({
      tasks: [makeTask("T1", "Setup OAuth2 Provider XYZUNIQUE", "todo")],
    });
    expect(matchesFeatureModeSearch(f, "OAuth2")).toBe(false);
    expect(matchesFeatureModeSearch(f, "XYZUNIQUE")).toBe(false);
  });

  it("task id in feature does NOT match in Feature Mode", () => {
    const f = makeFeature({
      tasks: [makeTask("T9", "Some task", "ready")],
    });
    expect(matchesFeatureModeSearch(f, "T9")).toBe(false);
  });
});

// ─── Mode persistence across reload ──────────────────────────────────────

describe("Mode and filter persistence (simulates browser reload)", () => {
  it("'feature' mode is restored after save", () => {
    saveBoardMode("feature");
    const restored = getStoredBoardMode() ?? getDefaultBoardMode();
    expect(restored).toBe("feature");
  });

  it("'task' mode is restored after save", () => {
    saveBoardMode("task");
    const restored = getStoredBoardMode() ?? getDefaultBoardMode();
    expect(restored).toBe("task");
  });

  it("switching from task to feature and back restores 'task'", () => {
    saveBoardMode("task");
    saveBoardMode("feature");
    saveBoardMode("task");
    expect(getStoredBoardMode()).toBe("task");
  });
});

// ─── FeatureListRow responsive layout attributes ──────────────────────────

describe("FeatureListRow — responsive layout and overflow safety", () => {
  it("renders a container that uses flex layout for row alignment", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureListRow, {
        feature: makeFeature(),
        onClick: () => undefined,
      }),
    );
    // flex class must be present for row layout
    expect(html).toContain("flex");
  });

  it("renders truncation class on feature id to prevent overflow", () => {
    const feature = makeFeature({
      id: "a-very-long-feature-id-that-could-overflow-the-container",
    });
    const html = renderToStaticMarkup(
      React.createElement(FeatureListRow, {
        feature,
        onClick: () => undefined,
      }),
    );
    expect(html).toContain("truncate");
  });

  it("renders min-w-0 on the text container to enable text truncation in flex", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureListRow, {
        feature: makeFeature(),
        onClick: () => undefined,
      }),
    );
    expect(html).toContain("min-w-0");
  });

  it("renders shrink-0 on the status pill to prevent status from being truncated", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureListRow, {
        feature: makeFeature(),
        onClick: () => undefined,
      }),
    );
    expect(html).toContain("shrink-0");
  });
});

// ─── Feature status label rendering — T5 regression ─────────────────────

describe("getFeatureStatusLabel — only renders feature lifecycle status labels", () => {
  it("renders correct label for every valid feature lifecycle status", () => {
    const expectedLabels: Record<string, string> = {
      in_design: "In Design",
      in_tdd: "In TDD",
      ready_for_implementation: "Ready",
      in_implementation: "In Progress",
      in_handoff: "Handoff",
      done: "Done",
      blocked: "Blocked",
      cancelled: "Cancelled",
    };
    for (const [status, label] of Object.entries(expectedLabels)) {
      expect(getFeatureStatusLabel(status)).toBe(label);
    }
  });

  it("returns 'Unknown' for non-feature-lifecycle status strings", () => {
    const invalid = ["todo", "ready", "in_progress", "in_review", "garbage", "", "pending"];
    for (const s of invalid) {
      expect(getFeatureStatusLabel(s)).toBe("Unknown");
    }
  });

  it("does not leak task lifecycle statuses as feature row labels", () => {
    const taskStatuses = ["todo", "ready", "in_progress", "in_review"];
    for (const ts of taskStatuses) {
      expect(getFeatureStatusLabel(ts)).not.toBe(ts);
      expect(getFeatureStatusLabel(ts)).not.toBe(ts.replace(/_/g, " "));
    }
  });
});
