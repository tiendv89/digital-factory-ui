import { beforeEach, describe, expect, it } from "vitest";
import {
  matchesTaskModeSearch,
  matchesTaskModeStatusFilter,
} from "../features/board/lib/filter";
import {
  getAllFeatureStatusFilterKeys,
  getAllStatusFilterKeys,
  isAllFeatureStatusFilterSelected,
  isAllStatusFilterSelected,
  toggleAllFeatureStatusFilter,
  toggleAllStatusFilter,
  toggleStatusFilter,
} from "../features/board/lib/status-filter";
import {
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
import { FEATURE_STATUS_OPTIONS, STATUS_COLUMNS } from "../features/board/lib/status";
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

function makeFeature(overrides: Partial<ParsedFeature> = {}): ParsedFeature {
  return {
    id: "test-feature",
    title: "Test Feature",
    featureStatus: "in_implementation",
    tasks: [],
    ...overrides,
  };
}

function makeTask(
  id: string,
  title: string,
  status: string,
): ParsedFeature["tasks"][number] {
  return { id, title, status, dependsOn: [] };
}

// ─── Task Mode search regression ─────────────────────────────────────────────

describe("Task Mode search (matchesTaskModeSearch)", () => {
  it("returns true when query is empty", () => {
    expect(matchesTaskModeSearch(makeFeature(), "")).toBe(true);
  });

  it("matches on feature title (case-insensitive)", () => {
    const f = makeFeature({ title: "Authentication System" });
    expect(matchesTaskModeSearch(f, "auth")).toBe(true);
    expect(matchesTaskModeSearch(f, "AUTH")).toBe(true);
    expect(matchesTaskModeSearch(f, "payment")).toBe(false);
  });

  it("matches on feature id", () => {
    const f = makeFeature({ id: "dashboard-feature" });
    expect(matchesTaskModeSearch(f, "dashboard")).toBe(true);
    expect(matchesTaskModeSearch(f, "xyz")).toBe(false);
  });

  it("matches on task title", () => {
    const f = makeFeature({
      tasks: [makeTask("T1", "Setup OAuth providers", "todo")],
    });
    expect(matchesTaskModeSearch(f, "oauth")).toBe(true);
    expect(matchesTaskModeSearch(f, "payment")).toBe(false);
  });

  it("matches on task id", () => {
    const f = makeFeature({
      tasks: [makeTask("T3", "Some task", "in_progress")],
    });
    expect(matchesTaskModeSearch(f, "T3")).toBe(true);
    expect(matchesTaskModeSearch(f, "T99")).toBe(false);
  });

  it("returns false when no feature or task fields match", () => {
    const f = makeFeature({
      id: "alpha",
      title: "Alpha Feature",
      tasks: [makeTask("T1", "Alpha task", "todo")],
    });
    expect(matchesTaskModeSearch(f, "zzz")).toBe(false);
  });
});

// ─── Task Mode status filter regression ──────────────────────────────────────

describe("Task Mode status filter (matchesTaskModeStatusFilter)", () => {
  it("returns true when statuses list is empty", () => {
    const f = makeFeature({ tasks: [makeTask("T1", "t", "todo")] });
    expect(matchesTaskModeStatusFilter(f, [])).toBe(true);
  });

  it("returns true when at least one task matches a selected status", () => {
    const f = makeFeature({
      tasks: [
        makeTask("T1", "t1", "todo"),
        makeTask("T2", "t2", "done"),
      ],
    });
    expect(matchesTaskModeStatusFilter(f, ["todo"])).toBe(true);
    expect(matchesTaskModeStatusFilter(f, ["done"])).toBe(true);
  });

  it("returns false when no task matches any selected status", () => {
    const f = makeFeature({ tasks: [makeTask("T1", "t", "todo")] });
    expect(matchesTaskModeStatusFilter(f, ["in_progress", "blocked"])).toBe(false);
  });

  it("returns false for a feature with no tasks when statuses are selected", () => {
    const f = makeFeature({ tasks: [] });
    expect(matchesTaskModeStatusFilter(f, ["todo", "in_progress"])).toBe(false);
  });
});

// ─── Task Mode filter toggle helpers ─────────────────────────────────────────

describe("toggleStatusFilter", () => {
  it("adds a status that is not selected", () => {
    const result = toggleStatusFilter(["todo"], "in_progress");
    expect(result).toContain("in_progress");
    expect(result).toContain("todo");
  });

  it("removes a status that is already selected", () => {
    const result = toggleStatusFilter(["todo", "in_progress"], "todo");
    expect(result).not.toContain("todo");
    expect(result).toContain("in_progress");
  });
});

describe("isAllStatusFilterSelected", () => {
  it("returns true when all task statuses are selected", () => {
    const all = getAllStatusFilterKeys();
    expect(isAllStatusFilterSelected(all)).toBe(true);
  });

  it("returns false when at least one status is missing", () => {
    const partial = STATUS_COLUMNS.filter((s) => s.key !== "done").map(
      (s) => s.key,
    );
    expect(isAllStatusFilterSelected(partial)).toBe(false);
  });
});

describe("toggleAllStatusFilter", () => {
  it("selects all when fewer than all are selected", () => {
    const result = toggleAllStatusFilter(["todo"]);
    expect(result).toHaveLength(STATUS_COLUMNS.length);
  });

  it("deselects all when all are already selected", () => {
    const all = getAllStatusFilterKeys();
    expect(toggleAllStatusFilter(all)).toEqual([]);
  });
});

// ─── Feature Mode filter helpers ─────────────────────────────────────────────

describe("isAllFeatureStatusFilterSelected", () => {
  it("returns true when all feature statuses are selected", () => {
    const all = getAllFeatureStatusFilterKeys();
    expect(isAllFeatureStatusFilterSelected(all)).toBe(true);
  });

  it("returns false when at least one feature status is missing", () => {
    const partial = FEATURE_STATUS_OPTIONS.filter((s) => s.key !== "done").map(
      (s) => s.key,
    );
    expect(isAllFeatureStatusFilterSelected(partial)).toBe(false);
  });
});

describe("toggleAllFeatureStatusFilter", () => {
  it("selects all feature statuses when fewer than all are selected", () => {
    const result = toggleAllFeatureStatusFilter(["in_design"]);
    expect(result).toHaveLength(FEATURE_STATUS_OPTIONS.length);
  });

  it("deselects all feature statuses when all are already selected", () => {
    const all = getAllFeatureStatusFilterKeys();
    expect(toggleAllFeatureStatusFilter(all)).toEqual([]);
  });
});

// ─── Mode state does not bleed across modes ───────────────────────────────────

describe("Task Mode and Feature Mode filter state isolation", () => {
  it("saving task filters does not change stored feature filters", () => {
    saveStatusFilter(["todo", "in_progress"]);
    saveFeatureStatusFilter(["in_design", "blocked"]);

    const task = getStoredStatusFilter();
    const feature = getStoredFeatureStatusFilter();

    expect(task).toEqual(["todo", "in_progress"]);
    expect(feature).toEqual(["in_design", "blocked"]);
  });

  it("saving feature filters does not overwrite task filters", () => {
    saveStatusFilter(["done"]);
    saveFeatureStatusFilter(["in_handoff"]);

    expect(getStoredStatusFilter()).toEqual(["done"]);
    expect(getStoredFeatureStatusFilter()).toEqual(["in_handoff"]);
  });

  it("task and feature filters use separate localStorage keys", () => {
    saveStatusFilter(["todo"]);
    saveFeatureStatusFilter(["in_design"]);

    const taskKey = store["dashboard:board-status-filter"];
    const featureKey = store["dashboard:board-feature-status-filter"];

    expect(taskKey).toBeDefined();
    expect(featureKey).toBeDefined();
    expect(taskKey).not.toEqual(featureKey);
  });
});

// ─── Board mode persistence ───────────────────────────────────────────────────

describe("Board mode persistence", () => {
  it("default board mode is task", () => {
    expect(getDefaultBoardMode()).toBe("task");
  });

  it("returns null when no mode is stored", () => {
    expect(getStoredBoardMode()).toBeNull();
  });

  it("persists and retrieves task mode", () => {
    saveBoardMode("task");
    expect(getStoredBoardMode()).toBe("task");
  });

  it("persists and retrieves feature mode", () => {
    saveBoardMode("feature");
    expect(getStoredBoardMode()).toBe("feature");
  });

  it("switching from task to feature mode does not change task filters", () => {
    saveStatusFilter(["todo", "ready"]);
    saveBoardMode("feature");

    expect(getStoredStatusFilter()).toEqual(["todo", "ready"]);
  });

  it("switching from feature to task mode does not change feature filters", () => {
    saveFeatureStatusFilter(["in_design", "blocked"]);
    saveBoardMode("task");

    expect(getStoredFeatureStatusFilter()).toEqual(["in_design", "blocked"]);
  });
});

// ─── Task Mode filter defaults and persistence ────────────────────────────────

describe("Task Mode filter persistence", () => {
  it("default task filter excludes done", () => {
    const defaults = getDefaultStatusFilter();
    expect(defaults).not.toContain("done");
    expect(defaults.length).toBe(STATUS_COLUMNS.length - 1);
  });

  it("returns null when no task filter is stored", () => {
    expect(getStoredStatusFilter()).toBeNull();
  });

  it("persists and retrieves task status filter", () => {
    saveStatusFilter(["todo", "in_progress"]);
    expect(getStoredStatusFilter()).toEqual(["todo", "in_progress"]);
  });

  it("rejects invalid task statuses on read", () => {
    store["dashboard:board-status-filter"] = JSON.stringify([
      "invalid_status",
      "todo",
    ]);
    expect(getStoredStatusFilter()).toBeNull();
  });
});

// ─── Feature Mode filter defaults and persistence ─────────────────────────────

describe("Feature Mode filter persistence", () => {
  it("default feature filter excludes done", () => {
    const defaults = getDefaultFeatureStatusFilter();
    expect(defaults).not.toContain("done");
    expect(defaults.length).toBe(FEATURE_STATUS_OPTIONS.length - 1);
  });

  it("returns null when no feature filter is stored", () => {
    expect(getStoredFeatureStatusFilter()).toBeNull();
  });

  it("persists and retrieves feature status filter", () => {
    saveFeatureStatusFilter(["in_design", "in_tdd"]);
    expect(getStoredFeatureStatusFilter()).toEqual(["in_design", "in_tdd"]);
  });

  it("rejects invalid feature statuses on read", () => {
    store["dashboard:board-feature-status-filter"] = JSON.stringify([
      "not_a_valid_status",
    ]);
    expect(getStoredFeatureStatusFilter()).toBeNull();
  });
});
