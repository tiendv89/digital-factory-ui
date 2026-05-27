import { describe, it, expect, beforeEach } from "vitest";
import {
  matchesFeatureModeSearch,
  matchesFeatureModeStatusFilter,
  matchesTaskModeSearch,
  matchesTaskModeStatusFilter,
  matchesSearch,
  matchesStatusFilter,
} from "../features/board/lib/filter";
import {
  getDefaultFeatureStatusFilter,
  getStoredFeatureStatusFilter,
  saveFeatureStatusFilter,
} from "../features/board/lib/feature-status-filter-store";
import {
  getStoredBoardMode,
  saveBoardMode,
} from "../features/board/lib/board-mode-store";
import {
  toggleFeatureStatusFilter,
  toggleAllFeatureStatusFilter,
  isAllFeatureStatusFilterSelected,
} from "../features/board/lib/feature-status-filter";
import {
  FEATURE_STATUS_OPTIONS,
  getFeatureStatusLabel,
  getFeatureStatusColor,
} from "../features/board/lib/status";
import { saveStatusFilter } from "../features/board/lib/status-filter-store";
import type { ParsedFeature } from "../services/yaml-parser";

// localStorage shim
const store: Record<string, string> = {};
const mockLS = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};
// @ts-expect-error test shim
global.window = {};
// @ts-expect-error test shim
global.localStorage = mockLS;

function makeFeature(overrides: Partial<ParsedFeature> = {}): ParsedFeature {
  return {
    id: "test-feature",
    title: "Test Feature",
    featureStatus: "in_implementation",
    tasks: [],
    ...overrides,
  };
}

function makeTask(id: string, title: string, status: string) {
  return { id, title, status, dependsOn: [] };
}

beforeEach(() => {
  mockLS.clear();
});

// ─── FEATURE_STATUS_OPTIONS ────────────────────────────────────────────────

describe("FEATURE_STATUS_OPTIONS", () => {
  it("contains exactly 8 feature statuses", () => {
    expect(FEATURE_STATUS_OPTIONS).toHaveLength(8);
  });

  it("includes all required feature lifecycle statuses", () => {
    const keys = FEATURE_STATUS_OPTIONS.map((o) => o.key);
    expect(keys).toContain("in_design");
    expect(keys).toContain("in_tdd");
    expect(keys).toContain("ready_for_implementation");
    expect(keys).toContain("in_implementation");
    expect(keys).toContain("in_handoff");
    expect(keys).toContain("done");
    expect(keys).toContain("blocked");
    expect(keys).toContain("cancelled");
  });

  it("every option has a non-empty label and valid hex color", () => {
    for (const opt of FEATURE_STATUS_OPTIONS) {
      expect(opt.label).toBeTruthy();
      expect(opt.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

// ─── matchesFeatureModeSearch ──────────────────────────────────────────────

describe("matchesFeatureModeSearch", () => {
  it("returns true when query is empty", () => {
    expect(matchesFeatureModeSearch(makeFeature(), "")).toBe(true);
  });

  it("matches on feature id (case-insensitive)", () => {
    const f = makeFeature({ id: "auth-feature" });
    expect(matchesFeatureModeSearch(f, "auth")).toBe(true);
    expect(matchesFeatureModeSearch(f, "AUTH")).toBe(true);
    expect(matchesFeatureModeSearch(f, "payment")).toBe(false);
  });

  it("matches on feature title (case-insensitive)", () => {
    const f = makeFeature({ title: "Authentication System" });
    expect(matchesFeatureModeSearch(f, "authentication")).toBe(true);
    expect(matchesFeatureModeSearch(f, "SYSTEM")).toBe(true);
    expect(matchesFeatureModeSearch(f, "payment")).toBe(false);
  });

  it("does NOT match on task title or task id", () => {
    const f = makeFeature({
      tasks: [makeTask("T1", "Setup OAuth", "todo")],
    });
    expect(matchesFeatureModeSearch(f, "oauth")).toBe(false);
    expect(matchesFeatureModeSearch(f, "T1")).toBe(false);
  });
});

// ─── matchesFeatureModeStatusFilter ──────────────────────────────────────

describe("matchesFeatureModeStatusFilter", () => {
  it("returns false when statuses array is empty", () => {
    const f = makeFeature({ featureStatus: "in_implementation" });
    expect(matchesFeatureModeStatusFilter(f, [])).toBe(false);
  });

  it("returns true when featureStatus is in the filter", () => {
    const f = makeFeature({ featureStatus: "in_implementation" });
    expect(matchesFeatureModeStatusFilter(f, ["in_implementation"])).toBe(true);
    expect(matchesFeatureModeStatusFilter(f, ["in_design", "in_implementation"])).toBe(true);
  });

  it("returns false when featureStatus is not in the filter", () => {
    const f = makeFeature({ featureStatus: "in_implementation" });
    expect(matchesFeatureModeStatusFilter(f, ["done", "cancelled"])).toBe(false);
  });

  it("handles unknown feature statuses without crashing", () => {
    const f = makeFeature({ featureStatus: "unknown_future_status" });
    expect(matchesFeatureModeStatusFilter(f, ["unknown_future_status"])).toBe(true);
    expect(matchesFeatureModeStatusFilter(f, ["in_design"])).toBe(false);
  });
});

// ─── matchesTaskModeSearch (mode-explicit alias) ──────────────────────────

describe("matchesTaskModeSearch", () => {
  it("searches feature title, id, task title, and task id", () => {
    const f = makeFeature({
      id: "feat-x",
      title: "Feature X",
      tasks: [makeTask("T7", "Setup Oauth", "todo")],
    });
    expect(matchesTaskModeSearch(f, "feat-x")).toBe(true);
    expect(matchesTaskModeSearch(f, "Feature X")).toBe(true);
    expect(matchesTaskModeSearch(f, "oauth")).toBe(true);
    expect(matchesTaskModeSearch(f, "T7")).toBe(true);
    expect(matchesTaskModeSearch(f, "xyz-nomatch")).toBe(false);
  });
});

// ─── matchesTaskModeStatusFilter (mode-explicit alias) ───────────────────

describe("matchesTaskModeStatusFilter", () => {
  it("returns true for empty statuses array", () => {
    const f = makeFeature({ tasks: [makeTask("T1", "Task", "done")] });
    expect(matchesTaskModeStatusFilter(f, [])).toBe(true);
  });

  it("returns true when a task matches the filter", () => {
    const f = makeFeature({ tasks: [makeTask("T1", "Task", "in_progress")] });
    expect(matchesTaskModeStatusFilter(f, ["in_progress"])).toBe(true);
  });
});

// ─── backward-compat aliases ──────────────────────────────────────────────

describe("backward-compatible matchesSearch / matchesStatusFilter", () => {
  it("matchesSearch delegates to task mode search", () => {
    const f = makeFeature({
      id: "my-feature",
      tasks: [makeTask("T1", "Task title", "todo")],
    });
    expect(matchesSearch(f, "T1")).toBe(true);
    expect(matchesSearch(f, "task title")).toBe(true);
    expect(matchesSearch(f, "my-feature")).toBe(true);
  });

  it("matchesStatusFilter delegates to task mode filter", () => {
    const f = makeFeature({ tasks: [makeTask("T1", "Task", "done")] });
    expect(matchesStatusFilter(f, [])).toBe(true);
    expect(matchesStatusFilter(f, ["done"])).toBe(true);
    expect(matchesStatusFilter(f, ["in_progress"])).toBe(false);
  });
});

// ─── getDefaultFeatureStatusFilter ───────────────────────────────────────

describe("getDefaultFeatureStatusFilter", () => {
  it("returns all feature statuses except done", () => {
    const defaults = getDefaultFeatureStatusFilter();
    expect(defaults).not.toContain("done");
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

// ─── feature status filter store ─────────────────────────────────────────

describe("feature-status-filter-store", () => {
  it("returns null when nothing is stored", () => {
    expect(getStoredFeatureStatusFilter()).toBeNull();
  });

  it("restores a previously saved filter", () => {
    saveFeatureStatusFilter(["in_design", "blocked"]);
    expect(getStoredFeatureStatusFilter()).toEqual(["in_design", "blocked"]);
  });

  it("uses a separate key from task status filter", () => {
    saveFeatureStatusFilter(["in_design"]);
    const taskFilter = mockLS.getItem("dashboard:board-status-filter");
    expect(taskFilter).toBeNull();
    const featureFilter = mockLS.getItem("dashboard:board-feature-status-filter");
    expect(featureFilter).not.toBeNull();
  });

  it("returns null for invalid stored values", () => {
    mockLS.setItem(
      "dashboard:board-feature-status-filter",
      JSON.stringify(["not_a_real_status"]),
    );
    expect(getStoredFeatureStatusFilter()).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    mockLS.setItem("dashboard:board-feature-status-filter", "invalid-json");
    expect(getStoredFeatureStatusFilter()).toBeNull();
  });

  it("persists an empty filter array", () => {
    saveFeatureStatusFilter([]);
    expect(getStoredFeatureStatusFilter()).toEqual([]);
  });

  it("overwrites a previous save", () => {
    saveFeatureStatusFilter(["in_design"]);
    saveFeatureStatusFilter(["done", "cancelled"]);
    expect(getStoredFeatureStatusFilter()).toEqual(["done", "cancelled"]);
  });
});

// ─── board-mode-store ─────────────────────────────────────────────────────

describe("board-mode-store", () => {
  it("returns null when nothing is stored", () => {
    expect(getStoredBoardMode()).toBeNull();
  });

  it("stores and restores 'task' mode", () => {
    saveBoardMode("task");
    expect(getStoredBoardMode()).toBe("task");
  });

  it("stores and restores 'feature' mode", () => {
    saveBoardMode("feature");
    expect(getStoredBoardMode()).toBe("feature");
  });

  it("uses dashboard:board-mode storage key", () => {
    saveBoardMode("feature");
    const raw = mockLS.getItem("dashboard:board-mode");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toBe("feature");
  });

  it("returns null for an invalid stored mode", () => {
    mockLS.setItem("dashboard:board-mode", JSON.stringify("invalid_mode"));
    expect(getStoredBoardMode()).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    mockLS.setItem("dashboard:board-mode", "bad-json");
    expect(getStoredBoardMode()).toBeNull();
  });

  it("overwrites previous mode", () => {
    saveBoardMode("task");
    saveBoardMode("feature");
    expect(getStoredBoardMode()).toBe("feature");
  });
});

// ─── feature-status-filter toggle helpers ────────────────────────────────

describe("toggleFeatureStatusFilter", () => {
  it("adds a status that is not selected", () => {
    const result = toggleFeatureStatusFilter(["in_design"], "blocked");
    expect(result).toContain("in_design");
    expect(result).toContain("blocked");
  });

  it("removes a status that is selected", () => {
    const result = toggleFeatureStatusFilter(["in_design", "blocked"], "blocked");
    expect(result).toContain("in_design");
    expect(result).not.toContain("blocked");
  });
});

describe("isAllFeatureStatusFilterSelected", () => {
  it("returns false when no statuses are selected", () => {
    expect(isAllFeatureStatusFilterSelected([])).toBe(false);
  });

  it("returns true when all feature statuses are selected", () => {
    const allKeys = FEATURE_STATUS_OPTIONS.map((o) => o.key);
    expect(isAllFeatureStatusFilterSelected(allKeys)).toBe(true);
  });

  it("returns false when some statuses are missing", () => {
    expect(isAllFeatureStatusFilterSelected(["in_design", "done"])).toBe(false);
  });
});

describe("toggleAllFeatureStatusFilter", () => {
  it("selects all when none selected", () => {
    const result = toggleAllFeatureStatusFilter([]);
    expect(result).toHaveLength(FEATURE_STATUS_OPTIONS.length);
  });

  it("deselects all when all selected", () => {
    const all = FEATURE_STATUS_OPTIONS.map((o) => o.key);
    const result = toggleAllFeatureStatusFilter(all);
    expect(result).toHaveLength(0);
  });

  it("selects all when only some are selected", () => {
    const result = toggleAllFeatureStatusFilter(["in_design"]);
    expect(result).toHaveLength(FEATURE_STATUS_OPTIONS.length);
  });
});

// ─── separate state per mode ──────────────────────────────────────────────

describe("filter state isolation between modes", () => {
  it("feature mode filter does not affect task filter store key", () => {
    saveFeatureStatusFilter(["in_design"]);
    // Task filter key must remain untouched
    expect(mockLS.getItem("dashboard:board-status-filter")).toBeNull();
  });

  it("task filter does not affect feature filter store key", () => {
    saveStatusFilter(["todo", "in_progress"]);
    expect(mockLS.getItem("dashboard:board-feature-status-filter")).toBeNull();
  });

  it("matchesFeatureModeSearch empty filter returns false", () => {
    const f = makeFeature({ featureStatus: "done" });
    expect(matchesFeatureModeStatusFilter(f, [])).toBe(false);
  });
});

// ─── feature mode empty filter behavior ──────────────────────────────────

describe("feature mode with empty filters", () => {
  it("returns no features when all filters are deselected", () => {
    const features: ParsedFeature[] = [
      makeFeature({ id: "f1", featureStatus: "in_design" }),
      makeFeature({ id: "f2", featureStatus: "in_implementation" }),
    ];
    const result = features.filter((f) =>
      matchesFeatureModeStatusFilter(f, []),
    );
    expect(result).toHaveLength(0);
  });
});

// ─── unknown feature statuses ─────────────────────────────────────────────

describe("unknown feature statuses", () => {
  it("getFeatureStatusLabel returns 'Unknown' for unrecognized statuses", () => {
    expect(getFeatureStatusLabel("future_unknown_status")).toBe("Unknown");
  });

  it("getFeatureStatusColor returns fallback color for unknown status", () => {
    const color = getFeatureStatusColor("unknown_status_xyz");
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("matchesFeatureModeStatusFilter handles unknown statuses without crashing", () => {
    const f = makeFeature({ featureStatus: "some_future_status" });
    expect(() =>
      matchesFeatureModeStatusFilter(f, ["some_future_status"]),
    ).not.toThrow();
    expect(matchesFeatureModeStatusFilter(f, ["some_future_status"])).toBe(true);
  });
});
