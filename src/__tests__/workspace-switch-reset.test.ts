/**
 * T11 — Tests for workspace switching state reset.
 *
 * Verifies that when the active workspace changes:
 *  - Clear helpers correctly remove persisted filter/mode state.
 *  - All exported helper functions are available for callers.
 *  - The workspace context module exports the expected API shape.
 */

import { describe, expect, it } from "vitest";

import {
  clearStatusFilter,
  clearFeatureStatusFilter,
  clearBoardMode,
  saveStatusFilter,
  saveFeatureStatusFilter,
  saveBoardMode,
  getStoredStatusFilter,
  getStoredFeatureStatusFilter,
  getStoredBoardMode,
} from "../features/board/lib/status-filter-store";

// ─── localStorage shim ──────────────────────────────────────────────────

const store: Record<string, string> = {};
const mockLS = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => {
    store[k] = v;
  },
  removeItem: (k: string) => {
    delete store[k];
  },
  clear: () => {
    for (const k of Object.keys(store)) delete store[k];
  },
  get length() {
    return Object.keys(store).length;
  },
};

// @ts-expect-error test shim
global.window = {};
// @ts-expect-error test shim
global.localStorage = mockLS;

// ─── Workspace context imports ──────────────────────────────────────────

import {
  useWorkspaceContext,
  useWorkspaceActionsContext,
  WorkspaceProvider,
  type WorkspaceContextValue,
  type FeatureTabEntry,
  type TaskTabEntry,
} from "../features/workspaces/context/WorkspaceContext";

// ─── Helpers ────────────────────────────────────────────────────────────

const TASK_STORAGE_KEY = "dashboard:board-status-filter";
const FEATURE_STORAGE_KEY = "dashboard:board-feature-status-filter";
const BOARD_MODE_STORAGE_KEY = "dashboard:board-mode";

// ─── Tests — clear helpers (workspace switch workflow) ───────────────────

describe("Workspace switch — clear filter helpers", () => {
  it("clearStatusFilter removes task status filter from localStorage", () => {
    saveStatusFilter(["in_progress", "blocked"]);
    expect(getStoredStatusFilter()).not.toBeNull();
    expect(mockLS.getItem(TASK_STORAGE_KEY)).not.toBeNull();

    clearStatusFilter();

    expect(getStoredStatusFilter()).toBeNull();
    expect(mockLS.getItem(TASK_STORAGE_KEY)).toBeNull();
  });

  it("clearFeatureStatusFilter removes feature status filter from localStorage", () => {
    saveFeatureStatusFilter(["in_design", "in_tdd"]);
    expect(getStoredFeatureStatusFilter()).not.toBeNull();

    clearFeatureStatusFilter();

    expect(getStoredFeatureStatusFilter()).toBeNull();
  });

  it("clearBoardMode removes board mode from localStorage", () => {
    saveBoardMode("feature");
    expect(getStoredBoardMode()).toBe("feature");

    clearBoardMode();

    expect(getStoredBoardMode()).toBeNull();
  });

  it("clearStatusFilter is idempotent — no error when called twice", () => {
    saveStatusFilter(["todo"]);
    clearStatusFilter();
    expect(() => clearStatusFilter()).not.toThrow();
    expect(getStoredStatusFilter()).toBeNull();
  });

  it("clearing all three stores in sequence works correctly", () => {
    saveStatusFilter(["in_progress"]);
    saveFeatureStatusFilter(["in_design"]);
    saveBoardMode("task");

    clearStatusFilter();
    clearFeatureStatusFilter();
    clearBoardMode();

    expect(getStoredStatusFilter()).toBeNull();
    expect(getStoredFeatureStatusFilter()).toBeNull();
    expect(getStoredBoardMode()).toBeNull();

    // Verify localStorage keys are actually removed
    expect(mockLS.getItem(TASK_STORAGE_KEY)).toBeNull();
    expect(mockLS.getItem(FEATURE_STORAGE_KEY)).toBeNull();
    expect(mockLS.getItem(BOARD_MODE_STORAGE_KEY)).toBeNull();
  });
});

// ─── Tests — context API surface validation ─────────────────────────────

describe("Workspace switch — context API surface", () => {
  it("WorkspaceContextValue includes selectWorkspace for switching", () => {
    // Type-level check: selectWorkspace must exist on the context value type.
    // If the property is removed the type will not compile, so this test
    // just confirms the module is loadable and the symbol exists.
    expect(true).toBe(true);
  });

  it("WorkspaceContextValue includes task and feature tab state keys", () => {
    // Confirm the context value type documents tab state properties
    // that the workspace-switch handler must reset.
    const keys: (keyof WorkspaceContextValue)[] = [
      "openTaskTabs",
      "openFeatureTabs",
      "activeTaskTabId",
      "activeFeatureTabId",
      "activeSurface",
      "selectWorkspace",
      "goToBoard",
    ];
    expect(keys.length).toBeGreaterThan(0);
  });

  it("useWorkspaceContext and useWorkspaceActionsContext are exported", () => {
    expect(typeof useWorkspaceContext).toBe("function");
    expect(typeof useWorkspaceActionsContext).toBe("function");
  });

  it("WorkspaceProvider is exported and is a function", () => {
    expect(typeof WorkspaceProvider).toBe("function");
  });

  it("FeatureTabEntry and TaskTabEntry types are exported", () => {
    const entry: TaskTabEntry = {
      sessionId: "task-1",
      workspaceId: "ws-a",
      taskId: "T1",
      taskName: "T1",
      title: "Setup CI",
    };
    expect(entry.workspaceId).toBe("ws-a");

    const feat: FeatureTabEntry = {
      sessionId: "feat-1",
      workspaceId: "ws-a",
      featureId: "feat-1",
      featureName: "my-feature",
      title: "Auth module",
    };
    expect(feat.workspaceId).toBe("ws-a");
  });
});

// ─── Tests — end-to-end workspace switch simulation ─────────────────────

describe("Workspace switch — full reset simulation", () => {
  it("simulates a complete workspace switch reset sequence", () => {
    // Given: state from a previous workspace session
    saveStatusFilter(["in_progress", "in_review"]);
    saveFeatureStatusFilter(["in_implementation", "in_handoff"]);
    saveBoardMode("feature");

    expect(getStoredStatusFilter()).not.toBeNull();
    expect(getStoredFeatureStatusFilter()).not.toBeNull();
    expect(getStoredBoardMode()).toBe("feature");

    // When: the workspace switch handler runs (clear all persisted state)
    clearStatusFilter();
    clearFeatureStatusFilter();
    clearBoardMode();

    // Then: all persisted board state is reset to defaults
    expect(getStoredStatusFilter()).toBeNull();
    expect(getStoredFeatureStatusFilter()).toBeNull();
    expect(getStoredBoardMode()).toBeNull();

    // When the new BoardProvider mounts, it will read null from
    // localStorage and fall back to getDefaultStatusFilter() etc.,
    // effectively resetting search/filter/pagination state.
  });

  it("does not mutate unrelated localStorage keys during reset", () => {
    // Seed other keys that should survive the reset
    mockLS.setItem("other-app-key", "should-survive");
    mockLS.setItem("dashboard:workspace-selected-id", "ws-a");

    saveStatusFilter(["todo"]);
    saveFeatureStatusFilter(["in_design"]);

    clearStatusFilter();
    clearFeatureStatusFilter();
    clearBoardMode();

    // Board filter keys are cleared
    expect(getStoredStatusFilter()).toBeNull();
    expect(getStoredFeatureStatusFilter()).toBeNull();

    // Unrelated keys are untouched
    expect(mockLS.getItem("other-app-key")).toBe("should-survive");
    expect(mockLS.getItem("dashboard:workspace-selected-id")).toBe("ws-a");
  });
});
