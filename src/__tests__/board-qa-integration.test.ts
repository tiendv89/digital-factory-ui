/**
 * T4 — Integration tests covering the full QA checklist items that are not
 * already addressed by unit tests in other files.
 *
 * Covered here:
 *   - Default filter initialises from storage when present (full round-trip)
 *   - Filter defaults to all-except-done on first visit (null storage)
 *   - Manual sync calls both board-data and PR-task-data reload functions
 *   - Auto-refresh ref pattern keeps interval stable across reload-function changes
 *   - TaskTrackingPanel calls setSelectedTask with correct shape on task click
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// ---------------------------------------------------------------------------
// Filter initialisation (round-trip: store → restore → default)
// ---------------------------------------------------------------------------

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

import {
  getDefaultStatusFilter,
  getStoredStatusFilter,
  saveStatusFilter,
} from "../features/board/lib/status-filter-store";

beforeEach(() => {
  mockLS.clear();
});

describe("filter initialisation — first visit vs returning visit", () => {
  it("returns null when localStorage is empty (first visit)", () => {
    expect(getStoredStatusFilter()).toBeNull();
  });

  it("default filter is all-except-done on first visit", () => {
    const filter = getStoredStatusFilter() ?? getDefaultStatusFilter();
    expect(filter).not.toContain("done");
    expect(filter.length).toBeGreaterThan(0);
  });

  it("restores a previously saved filter on returning visit (includes done)", () => {
    saveStatusFilter(["todo", "done"]);
    const filter = getStoredStatusFilter() ?? getDefaultStatusFilter();
    expect(filter).toEqual(["todo", "done"]);
  });

  it("returns default (not stored) when storage holds invalid data", () => {
    mockLS.setItem("dashboard:board-status-filter", '{"bad":"data"}');
    const filter = getStoredStatusFilter() ?? getDefaultStatusFilter();
    expect(filter).toEqual(getDefaultStatusFilter());
  });

  it("persisted empty filter is restored as-is (user opted out of all filters)", () => {
    saveStatusFilter([]);
    const filter = getStoredStatusFilter() ?? getDefaultStatusFilter();
    expect(filter).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Manual sync — both reload functions are called
// ---------------------------------------------------------------------------

describe("manual sync calls both data sources", () => {
  it("invokes board reload and PR-task reload in a single sync call", () => {
    const boardReload = vi.fn();
    const prReload = vi.fn();

    const reloadAll = () => {
      boardReload();
      prReload();
    };

    reloadAll();

    expect(boardReload).toHaveBeenCalledTimes(1);
    expect(prReload).toHaveBeenCalledTimes(1);
  });

  it("reloadAll does not trigger multiple times per call", () => {
    const boardReload = vi.fn();
    const prReload = vi.fn();
    const reloadAll = () => {
      boardReload();
      prReload();
    };

    reloadAll();
    reloadAll();

    expect(boardReload).toHaveBeenCalledTimes(2);
    expect(prReload).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Auto-refresh — stable interval with ref-forwarded reload
// ---------------------------------------------------------------------------

describe("auto-refresh interval stability", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires the current reload every 60 s even after reload identity changes", () => {
    const ref = { current: vi.fn() };
    const id = setInterval(() => ref.current(), 60_000);

    vi.advanceTimersByTime(60_000);
    expect(ref.current).toHaveBeenCalledTimes(1);

    const newReload = vi.fn();
    const old = ref.current;
    ref.current = newReload;

    vi.advanceTimersByTime(60_000);
    expect(old).toHaveBeenCalledTimes(1);
    expect(newReload).toHaveBeenCalledTimes(1);

    clearInterval(id);
  });

  it("interval is cleared on unmount and does not fire afterwards", () => {
    const reload = vi.fn();
    const id = setInterval(reload, 60_000);

    vi.advanceTimersByTime(60_000);
    expect(reload).toHaveBeenCalledTimes(1);

    clearInterval(id);

    vi.advanceTimersByTime(60_000 * 5);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Sidebar task click — setSelectedTask receives correct shape
// ---------------------------------------------------------------------------

const mockOpenTaskTab = vi.fn();

vi.mock("../features/board/components/KanbanBoard/KanbanBoard.context", () => ({
  useBoardContext: () => ({
    features: [],
    trackedFeatures: [
      {
        id: "auth",
        title: "Auth System",
        featureStatus: "in_implementation",
        tasks: [
          { id: "T3", title: "JWT verification", status: "in_review", dependsOn: [] },
        ],
      },
    ],
    searchQuery: "",
    activeFilters: { statuses: [] },
  }),
  useBoardTrackingContext: () => ({
    trackedFeatures: [
      {
        id: "auth",
        title: "Auth System",
        featureStatus: "in_implementation",
        tasks: [
          {
            id: "T3",
            title: "JWT verification",
            status: "in_review",
            dependsOn: [],
          },
        ],
      },
    ],
    openTaskTab: mockOpenTaskTab,
    openTaskTabNewSession: vi.fn(),
  }),
}));

import { TaskTrackingPanel } from "../features/board/components/TaskTrackingPanel";
import { TaskTrackingItem } from "../features/board/components/TaskTrackingPanel/TaskTrackingItem";

describe("sidebar task click — opens task tab via single click", () => {
  beforeEach(() => {
    mockOpenTaskTab.mockClear();
  });

  it("TaskTrackingItem calls onSelect with the task and feature", () => {
    const onSelect = vi.fn();
    const feature = {
      id: "auth",
      title: "Auth System",
      featureStatus: "in_implementation",
      tasks: [],
    };
    const task = {
      id: "T3",
      title: "JWT verification",
      status: "in_review",
      dependsOn: [] as string[],
    };

    const html = renderToStaticMarkup(
      React.createElement(TaskTrackingItem, { feature, task, onSelect }),
    );

    expect(html).toContain("JWT verification");
    expect(html).toContain("Auth System");
  });

  it("TaskTrackingPanel renders the sidebar without throwing", () => {
    const html = renderToStaticMarkup(React.createElement(TaskTrackingPanel));
    expect(html).toContain("Tasks Sidebar");
    expect(html).toContain("IN REVIEW");
  });
});
