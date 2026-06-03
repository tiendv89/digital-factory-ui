/**
 * T4 — Task title wrapping (5 rows)
 *
 * Verifies that task and feature card titles use line-clamp-5 (not line-clamp-2
 * or truncate) and include break-words for long titles without spaces.
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ParsedFeature, ParsedTask } from "../services/yaml-parser";

// ─── Mocks required by TaskCard and TaskTrackingItem ─────────────────────────

vi.mock("../features/board/lib/status", () => ({
  getNextAction: () => null,
  clientStatusLabel: (s: string) => s,
  getStatusColor: () => "#000",
  STATUS_COLUMNS: [],
  clientFeatureStatusLabel: (s: string) => s,
  getFeatureStatusColor: () => "#000",
}));

vi.mock("../lib/time", () => ({
  formatTimestamp: (v: string) => v,
  getFeatureLastModifiedAt: () => null,
  isTodayTimestamp: () => false,
  computeStatusAge: () => "—",
  computeLastUpdatedLabel: () => null,
  getTaskLastUpdatedAt: () => null,
}));

vi.mock("../features/board/components/KanbanBoard/KanbanBoard.context", () => ({
  useBoardContext: () => ({ features: [], trackedFeatures: [], searchQuery: "", activeFilters: { statuses: [] } }),
  useBoardTrackingContext: () => ({ trackedFeatures: [], openTaskTab: vi.fn(), openTaskTabNewSession: vi.fn() }),
}));

vi.mock("../features/workspaces/context/WorkspaceContext", () => ({
  useWorkspaceContext: () => ({ selectedWorkspaceId: "ws-test" }),
  useWorkspaceActionsContext: () => ({
    syncCurrentWorkspace: vi.fn(),
    syncingWorkspace: false,
    syncError: null,
    openTaskTab: vi.fn(),
    openFeatureTab: vi.fn(),
  }),
}));

vi.mock("../features/board/hooks/useActivity", () => ({
  useActivity: () => ({ events: [], loading: false, error: null }),
}));

vi.mock("../features/board/hooks/useLastUpdatedTimer", () => ({
  useLastUpdatedTimer: () => undefined,
}));

vi.mock("../features/tasks/lib/status", () => ({
  getStatusStyle: () => ({ bg: "", text: "", dot: "" }),
  formatStatusLabel: (s: string) => s,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<ParsedTask> = {}): ParsedTask {
  return {
    id: "T1",
    title: "Short title",
    status: "ready",
    dependsOn: [],
    ...overrides,
  };
}

function makeFeature(overrides: Partial<ParsedFeature> = {}): ParsedFeature {
  return {
    id: "test-feature",
    title: "Test Feature",
    featureStatus: "in_implementation",
    tasks: [],
    ...overrides,
  };
}

const LONG_TITLE =
  "This is an extremely long task title that would previously have been clamped at two lines but should now wrap up to five rows before being clipped by the CSS line clamp utility";

const LONG_WORD_TITLE =
  "ThisIsAnExtremelyLongUnbrokenWordThatWouldOverflowWithoutWordBreakBreakWordApplied";

// ─── TaskCard ─────────────────────────────────────────────────────────────────

import { TaskCard } from "../features/board/components/TaskCard/TaskCard";

describe("TaskCard — title wrapping", () => {
  it("applies line-clamp-5 to the task title paragraph", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskCard, {
        task: makeTask({ title: LONG_TITLE }),
        featureId: "test-feature",
        featureTitle: "Test Feature",
      }),
    );
    expect(html).toContain("line-clamp-5");
    expect(html).not.toContain("line-clamp-2");
  });

  it("applies break-words to prevent long tokens overflowing the card", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskCard, {
        task: makeTask({ title: LONG_WORD_TITLE }),
        featureId: "test-feature",
        featureTitle: "Test Feature",
      }),
    );
    expect(html).toContain("break-words");
  });

  it("does not use bare truncate on the title", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskCard, {
        task: makeTask({ title: LONG_TITLE }),
        featureId: "test-feature",
        featureTitle: "Test Feature",
      }),
    );
    // The title element must not use single-line truncation
    const titleIndex = html.indexOf(LONG_TITLE);
    expect(titleIndex).toBeGreaterThan(-1);
    const titleContext = html.slice(Math.max(0, titleIndex - 200), titleIndex);
    expect(titleContext).not.toContain('"truncate"');
  });
});

// ─── TaskTrackingItem (sidebar) ──────────────────────────────────────────────

import { TaskTrackingItem } from "../features/board/components/TaskTrackingPanel/TaskTrackingItem";

describe("TaskTrackingItem — title wrapping", () => {
  const feature = makeFeature();

  it("applies line-clamp-5 to the task title paragraph", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTrackingItem, {
        feature,
        task: makeTask({ title: LONG_TITLE }),
        onSelect: () => undefined,
      }),
    );
    expect(html).toContain("line-clamp-5");
    expect(html).not.toContain("line-clamp-2");
  });

  it("applies break-words to handle unbroken long tokens", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTrackingItem, {
        feature,
        task: makeTask({ title: LONG_WORD_TITLE }),
        onSelect: () => undefined,
      }),
    );
    expect(html).toContain("break-words");
  });
});

// ─── FeatureListRow ────────────────────────────────────────────────────────────

import { FeatureListRow } from "../features/board/components/FeatureBoardView/FeatureListRow";

describe("FeatureListRow — title wrapping", () => {
  it("applies line-clamp-5 to the feature title paragraph", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureListRow, {
        feature: makeFeature({ title: LONG_TITLE }),
        onClick: () => undefined,
      }),
    );
    expect(html).toContain("line-clamp-5");
    expect(html).not.toContain("line-clamp-2");
  });

  it("applies break-words to prevent overflow for long feature titles", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureListRow, {
        feature: makeFeature({ title: LONG_WORD_TITLE }),
        onClick: () => undefined,
      }),
    );
    expect(html).toContain("break-words");
  });

  it("feature ID still uses truncate for compact secondary rendering", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureListRow, {
        feature: makeFeature({ id: "very-long-id-that-overflows", title: "Short" }),
        onClick: () => undefined,
      }),
    );
    expect(html).toContain("truncate");
  });
});
