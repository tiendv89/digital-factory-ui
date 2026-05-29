import { beforeEach, describe, expect, it } from "vitest";
import {
  matchesFeatureModeSearch,
  matchesFeatureModeStatusFilter,
  matchesTaskModeSearch,
  matchesTaskModeStatusFilter,
} from "../features/board/lib/filter";
import {
  FEATURE_STATUS_OPTIONS,
  type FeatureStatus,
} from "../features/board/lib/status";
import {
  type BoardMode,
  getDefaultBoardMode,
  getDefaultFeatureStatusFilter,
  getDefaultStatusFilter,
  getStoredBoardMode,
  getStoredFeatureStatusFilter,
  getStoredStatusFilter,
  saveBoardMode,
  saveFeatureStatusFilter,
  saveStatusFilter,
} from "../features/board/lib/status-filter-store";
import type { ParsedFeature } from "../services/yaml-parser";

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
    Object.keys(store).forEach((key) => {
      delete store[key];
    });
  },
};

// @ts-expect-error test storage shim
global.window = {};
// @ts-expect-error test storage shim
global.localStorage = mockLS;

beforeEach(() => {
  mockLS.clear();
});

// ─── helpers ───────────────────────────────────────────────────────────────

function makeFeature(
  overrides: Partial<ParsedFeature> = {},
): ParsedFeature {
  return {
    id: "test-feature",
    title: "Test Feature",
    featureStatus: "in_implementation",
    tasks: [],
    ...overrides,
  };
}

// ─── FEATURE_STATUS_OPTIONS ────────────────────────────────────────────────

describe("FEATURE_STATUS_OPTIONS", () => {
  it("includes all 8 supported feature statuses", () => {
    const keys = FEATURE_STATUS_OPTIONS.map((o) => o.key);
    expect(keys).toContain("in_design");
    expect(keys).toContain("in_tdd");
    expect(keys).toContain("ready_for_implementation");
    expect(keys).toContain("in_implementation");
    expect(keys).toContain("in_handoff");
    expect(keys).toContain("done");
    expect(keys).toContain("blocked");
    expect(keys).toContain("cancelled");
    expect(FEATURE_STATUS_OPTIONS).toHaveLength(8);
  });

  it("uses the product-facing label 'Handoff' for in_handoff", () => {
    const handoff = FEATURE_STATUS_OPTIONS.find((o) => o.key === "in_handoff");
    expect(handoff?.label).toBe("Handoff");
  });

  it("every option has a non-empty label and valid hex color", () => {
    for (const option of FEATURE_STATUS_OPTIONS) {
      expect(option.label).toBeTruthy();
      expect(option.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

// ─── getDefaultFeatureStatusFilter ─────────────────────────────────────────

describe("getDefaultFeatureStatusFilter", () => {
  it("includes all feature statuses except done", () => {
    const defaults = getDefaultFeatureStatusFilter();
    expect(defaults).not.toContain("done");
    const allExceptDone = FEATURE_STATUS_OPTIONS.filter(
      (s) => s.key !== "done",
    ).map((s) => s.key);
    expect(defaults).toEqual(allExceptDone);
  });

  it("includes in_design, in_tdd, ready_for_implementation, in_implementation, in_handoff, blocked, cancelled", () => {
    const defaults = getDefaultFeatureStatusFilter();
    expect(defaults).toContain("in_design");
    expect(defaults).toContain("in_tdd");
    expect(defaults).toContain("ready_for_implementation");
    expect(defaults).toContain("in_implementation");
    expect(defaults).toContain("in_handoff");
    expect(defaults).toContain("blocked");
    expect(defaults).toContain("cancelled");
  });
});

// ─── getStoredFeatureStatusFilter ──────────────────────────────────────────

describe("getStoredFeatureStatusFilter", () => {
  it("returns null when nothing is stored", () => {
    expect(getStoredFeatureStatusFilter()).toBeNull();
  });

  it("restores a previously saved feature filter", () => {
    saveFeatureStatusFilter(["in_implementation", "in_handoff"]);
    expect(getStoredFeatureStatusFilter()).toEqual([
      "in_implementation",
      "in_handoff",
    ]);
  });

  it("returns null for invalid stored values", () => {
    mockLS.setItem(
      "dashboard:board-feature-status-filter",
      JSON.stringify(["invalid_status"]),
    );
    expect(getStoredFeatureStatusFilter()).toBeNull();
  });

  it("returns null for non-array stored data", () => {
    mockLS.setItem(
      "dashboard:board-feature-status-filter",
      JSON.stringify({ statuses: ["in_implementation"] }),
    );
    expect(getStoredFeatureStatusFilter()).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    mockLS.setItem("dashboard:board-feature-status-filter", "not-json");
    expect(getStoredFeatureStatusFilter()).toBeNull();
  });

  it("persists an empty filter (user opted out of all statuses)", () => {
    saveFeatureStatusFilter([]);
    expect(getStoredFeatureStatusFilter()).toEqual([]);
  });
});

// ─── saveFeatureStatusFilter ────────────────────────────────────────────────

describe("saveFeatureStatusFilter", () => {
  it("persists a full selection", () => {
    const statuses: FeatureStatus[] = ["in_implementation", "blocked"];
    saveFeatureStatusFilter(statuses);
    const raw = mockLS.getItem("dashboard:board-feature-status-filter");
    expect(JSON.parse(raw!)).toEqual(statuses);
  });

  it("overwrites a previous save", () => {
    saveFeatureStatusFilter(["in_design"]);
    saveFeatureStatusFilter(["done", "cancelled"]);
    expect(getStoredFeatureStatusFilter()).toEqual(["done", "cancelled"]);
  });
});

// ─── task mode filter storage unchanged ────────────────────────────────────

describe("task mode filter storage (backward-compatible key)", () => {
  it("uses the original dashboard:board-status-filter key", () => {
    saveStatusFilter(["todo", "ready"]);
    const raw = mockLS.getItem("dashboard:board-status-filter");
    expect(JSON.parse(raw!)).toEqual(["todo", "ready"]);
  });

  it("task and feature filter storage are independent", () => {
    saveStatusFilter(["todo"]);
    saveFeatureStatusFilter(["in_design"]);
    expect(getStoredStatusFilter()).toEqual(["todo"]);
    expect(getStoredFeatureStatusFilter()).toEqual(["in_design"]);
  });
});

// ─── board mode storage ─────────────────────────────────────────────────────

describe("getDefaultBoardMode", () => {
  it("defaults to 'task'", () => {
    expect(getDefaultBoardMode()).toBe("task");
  });
});

describe("getStoredBoardMode", () => {
  it("returns null when nothing is stored", () => {
    expect(getStoredBoardMode()).toBeNull();
  });

  it("returns 'task' after saving 'task'", () => {
    saveBoardMode("task");
    expect(getStoredBoardMode()).toBe("task");
  });

  it("returns 'feature' after saving 'feature'", () => {
    saveBoardMode("feature");
    expect(getStoredBoardMode()).toBe("feature");
  });

  it("returns null for an invalid stored value", () => {
    mockLS.setItem("dashboard:board-mode", JSON.stringify("invalid_mode"));
    expect(getStoredBoardMode()).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    mockLS.setItem("dashboard:board-mode", "not-json");
    expect(getStoredBoardMode()).toBeNull();
  });
});

describe("saveBoardMode", () => {
  it("overwrites the previous mode", () => {
    saveBoardMode("feature");
    saveBoardMode("task");
    expect(getStoredBoardMode()).toBe("task");
  });
});

// ─── Mode-switching state isolation ────────────────────────────────────────

describe("filter state independence between modes", () => {
  it("task status filter and feature status filter use different storage keys", () => {
    saveStatusFilter(["todo", "in_progress"]);
    saveFeatureStatusFilter(["in_design", "in_handoff"]);

    expect(getStoredStatusFilter()).toEqual(["todo", "in_progress"]);
    expect(getStoredFeatureStatusFilter()).toEqual(["in_design", "in_handoff"]);
  });

  it("saving a feature filter does not affect the task filter", () => {
    saveStatusFilter(["ready"]);
    saveFeatureStatusFilter(["blocked"]);
    expect(getStoredStatusFilter()).toEqual(["ready"]);
  });

  it("saving a task filter does not affect the feature filter", () => {
    saveFeatureStatusFilter(["in_implementation"]);
    saveStatusFilter(["done"]);
    expect(getStoredFeatureStatusFilter()).toEqual(["in_implementation"]);
  });
});

// ─── Board mode fallback ────────────────────────────────────────────────────

describe("board mode fallback", () => {
  it("falls back to 'task' when no stored mode exists", () => {
    const mode: BoardMode = getStoredBoardMode() ?? getDefaultBoardMode();
    expect(mode).toBe("task");
  });

  it("falls back to 'task' for an invalid stored value", () => {
    mockLS.setItem("dashboard:board-mode", JSON.stringify("garbage"));
    const mode: BoardMode = getStoredBoardMode() ?? getDefaultBoardMode();
    expect(mode).toBe("task");
  });

  it("restores 'feature' mode from storage", () => {
    saveBoardMode("feature");
    const mode: BoardMode = getStoredBoardMode() ?? getDefaultBoardMode();
    expect(mode).toBe("feature");
  });
});

// ─── matchesTaskModeSearch ──────────────────────────────────────────────────

describe("matchesTaskModeSearch", () => {
  it("returns true when query is empty", () => {
    expect(matchesTaskModeSearch(makeFeature(), "")).toBe(true);
  });

  it("matches on feature title", () => {
    const f = makeFeature({ title: "Authentication System" });
    expect(matchesTaskModeSearch(f, "auth")).toBe(true);
    expect(matchesTaskModeSearch(f, "payment")).toBe(false);
  });

  it("matches on feature id", () => {
    const f = makeFeature({ id: "dashboard-feature" });
    expect(matchesTaskModeSearch(f, "dashboard")).toBe(true);
  });

  it("matches on task title in task mode", () => {
    const f = makeFeature({
      tasks: [{ id: "T1", title: "Setup OAuth", status: "todo", dependsOn: [] }],
    });
    expect(matchesTaskModeSearch(f, "oauth")).toBe(true);
    expect(matchesTaskModeSearch(f, "payment")).toBe(false);
  });

  it("matches on task id in task mode", () => {
    const f = makeFeature({
      tasks: [{ id: "T7", title: "Some task", status: "ready", dependsOn: [] }],
    });
    expect(matchesTaskModeSearch(f, "T7")).toBe(true);
    expect(matchesTaskModeSearch(f, "T3")).toBe(false);
  });
});

// ─── matchesTaskModeStatusFilter ───────────────────────────────────────────

describe("matchesTaskModeStatusFilter", () => {
  it("returns true when task status filter is empty", () => {
    const f = makeFeature({
      tasks: [{ id: "T1", title: "Task", status: "done", dependsOn: [] }],
    });
    expect(matchesTaskModeStatusFilter(f, [])).toBe(true);
  });

  it("returns true when any task matches filter status", () => {
    const f = makeFeature({
      tasks: [
        { id: "T1", title: "Task 1", status: "done", dependsOn: [] },
        { id: "T2", title: "Task 2", status: "in_progress", dependsOn: [] },
      ],
    });
    expect(matchesTaskModeStatusFilter(f, ["in_progress"])).toBe(true);
  });

  it("returns false when no task matches the filter", () => {
    const f = makeFeature({
      tasks: [{ id: "T1", title: "Task", status: "done", dependsOn: [] }],
    });
    expect(matchesTaskModeStatusFilter(f, ["in_progress", "ready"])).toBe(false);
  });
});

// ─── matchesFeatureModeSearch ───────────────────────────────────────────────

describe("matchesFeatureModeSearch", () => {
  it("returns true when query is empty", () => {
    expect(matchesFeatureModeSearch(makeFeature(), "")).toBe(true);
  });

  it("matches on feature title", () => {
    const f = makeFeature({ title: "Authentication System" });
    expect(matchesFeatureModeSearch(f, "auth")).toBe(true);
    expect(matchesFeatureModeSearch(f, "payment")).toBe(false);
  });

  it("matches on feature id", () => {
    const f = makeFeature({ id: "dashboard-feature" });
    expect(matchesFeatureModeSearch(f, "dashboard")).toBe(true);
    expect(matchesFeatureModeSearch(f, "xyz")).toBe(false);
  });

  it("does NOT match on task title in feature mode", () => {
    const f = makeFeature({
      tasks: [{ id: "T1", title: "OAuth Setup", status: "todo", dependsOn: [] }],
    });
    expect(matchesFeatureModeSearch(f, "oauth")).toBe(false);
  });

  it("does NOT match on task id in feature mode", () => {
    const f = makeFeature({
      tasks: [{ id: "T7", title: "Some task", status: "ready", dependsOn: [] }],
    });
    expect(matchesFeatureModeSearch(f, "T7")).toBe(false);
  });

  it("is case-insensitive", () => {
    const f = makeFeature({ title: "Authentication System" });
    expect(matchesFeatureModeSearch(f, "AUTH")).toBe(true);
    expect(matchesFeatureModeSearch(f, "authentication")).toBe(true);
  });
});

// ─── matchesFeatureModeStatusFilter ─────────────────────────────────────────

describe("matchesFeatureModeStatusFilter", () => {
  it("returns false when feature status filter is empty (no statuses selected = no rows)", () => {
    const f = makeFeature({ featureStatus: "in_implementation" });
    expect(matchesFeatureModeStatusFilter(f, [])).toBe(false);
  });

  it("returns true when feature status matches filter", () => {
    const f = makeFeature({ featureStatus: "in_implementation" });
    expect(matchesFeatureModeStatusFilter(f, ["in_implementation"])).toBe(true);
    expect(matchesFeatureModeStatusFilter(f, ["in_design", "in_implementation"])).toBe(true);
  });

  it("returns false when feature status does not match filter", () => {
    const f = makeFeature({ featureStatus: "in_implementation" });
    expect(matchesFeatureModeStatusFilter(f, ["done", "cancelled"])).toBe(false);
  });

  it("matches done features when done is in filter", () => {
    const f = makeFeature({ featureStatus: "done" });
    expect(matchesFeatureModeStatusFilter(f, ["done"])).toBe(true);
  });

  it("hides done features when done is not in filter", () => {
    const f = makeFeature({ featureStatus: "done" });
    expect(matchesFeatureModeStatusFilter(f, ["in_implementation", "blocked"])).toBe(false);
  });

  it("returns false for unknown feature status not in filter", () => {
    const f = makeFeature({ featureStatus: "some_future_status" });
    expect(matchesFeatureModeStatusFilter(f, ["in_implementation"])).toBe(false);
  });

  it("matches on task-mode filter does NOT affect feature mode filter (type safety)", () => {
    const f = makeFeature({ featureStatus: "in_implementation" });
    // task statuses should not accidentally match feature statuses
    expect(matchesFeatureModeStatusFilter(f, ["todo", "ready", "done"] as FeatureStatus[])).toBe(false);
  });
});

// ─── Task Mode default filter (getDefaultStatusFilter) ────────────────────

describe("getDefaultStatusFilter (task mode, backward-compat)", () => {
  it("excludes done", () => {
    expect(getDefaultStatusFilter()).not.toContain("done");
  });

  it("includes all task statuses except done", () => {
    const defaults = getDefaultStatusFilter();
    expect(defaults).toContain("todo");
    expect(defaults).toContain("ready");
    expect(defaults).toContain("in_progress");
    expect(defaults).toContain("reviewing");
    expect(defaults).toContain("blocked");
    expect(defaults).toContain("in_review");
    expect(defaults).toContain("cancelled");
  });
});
