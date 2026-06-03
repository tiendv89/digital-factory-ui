/**
 * T3 — Mode-specific filter contract tests.
 *
 * These tests prove that:
 * - Task Mode filters expose and submit only TASK_MODE_STATUSES.
 * - Feature Mode filters expose and submit only FEATURE_MODE_STATUSES.
 * - Stale stored values outside the allowlists are rejected.
 * - No non-canonical status (in_reviewing, review_passed, etc.) appears as a filter option.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  FEATURE_MODE_STATUSES,
  TASK_MODE_STATUSES,
} from "../features/board/lib/status";
import {
  getAllFeatureStatusFilterKeys,
  getAllStatusFilterKeys,
  isAllFeatureStatusFilterSelected,
  isAllStatusFilterSelected,
  toggleAllFeatureStatusFilter,
  toggleAllStatusFilter,
} from "../features/board/lib/status-filter";
import {
  getDefaultFeatureStatusFilter,
  getDefaultStatusFilter,
  getStoredFeatureStatusFilter,
  getStoredStatusFilter,
  saveFeatureStatusFilter,
  saveStatusFilter,
} from "../features/board/lib/status-filter-store";
import {
  getDefaultFeatureStatusFilter as featureStoreGetDefault,
  getStoredFeatureStatusFilter as featureStoreGetStored,
  saveFeatureStatusFilter as featureStoreSave,
} from "../features/board/lib/feature-status-filter-store";
import {
  getAllFeatureStatusFilterKeys as featureFilterGetAll,
  isAllFeatureStatusFilterSelected as featureFilterIsAll,
  toggleAllFeatureStatusFilter as featureFilterToggleAll,
} from "../features/board/lib/feature-status-filter";

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
    Object.keys(store).forEach((k) => {
      delete store[k];
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

// ─── TASK_MODE_STATUSES allowlist ───────────────────────────────────────────

describe("Task Mode filter allowlist — getAllStatusFilterKeys", () => {
  it("returns exactly the TASK_MODE_STATUSES allowlist", () => {
    expect(getAllStatusFilterKeys()).toEqual(TASK_MODE_STATUSES);
  });

  it("returns exactly 8 statuses", () => {
    expect(getAllStatusFilterKeys()).toHaveLength(8);
  });

  it("includes todo, ready, in_progress, blocked, in_review, reviewing, done, cancelled", () => {
    const keys = getAllStatusFilterKeys();
    expect(keys).toContain("todo");
    expect(keys).toContain("ready");
    expect(keys).toContain("in_progress");
    expect(keys).toContain("blocked");
    expect(keys).toContain("in_review");
    expect(keys).toContain("reviewing");
    expect(keys).toContain("done");
    expect(keys).toContain("cancelled");
  });

  it("does NOT include non-canonical in_reviewing", () => {
    expect(getAllStatusFilterKeys()).not.toContain("in_reviewing");
  });

  it("does NOT include review_passed", () => {
    expect(getAllStatusFilterKeys()).not.toContain("review_passed");
  });

  it("does NOT include review_incomplete", () => {
    expect(getAllStatusFilterKeys()).not.toContain("review_incomplete");
  });

  it("does NOT include change_requested", () => {
    expect(getAllStatusFilterKeys()).not.toContain("change_requested");
  });

  it("does NOT include any Feature Mode-only status", () => {
    const featureOnly = [
      "in_design",
      "in_tdd",
      "ready_for_implementation",
      "in_implementation",
      "in_handoff",
    ];
    const keys = getAllStatusFilterKeys();
    for (const s of featureOnly) {
      expect(keys).not.toContain(s);
    }
  });

  it("preserves spec order: todo, ready, in_progress, blocked, in_review, reviewing, done, cancelled", () => {
    expect(getAllStatusFilterKeys()).toEqual([
      "todo",
      "ready",
      "in_progress",
      "blocked",
      "in_review",
      "reviewing",
      "done",
      "cancelled",
    ]);
  });
});

// ─── FEATURE_MODE_STATUSES allowlist ────────────────────────────────────────

describe("Feature Mode filter allowlist — getAllFeatureStatusFilterKeys", () => {
  it("returns exactly the FEATURE_MODE_STATUSES allowlist", () => {
    expect(getAllFeatureStatusFilterKeys()).toEqual(FEATURE_MODE_STATUSES);
  });

  it("returns exactly 8 statuses", () => {
    expect(getAllFeatureStatusFilterKeys()).toHaveLength(8);
  });

  it("includes in_design, in_tdd, ready_for_implementation, in_implementation, in_handoff, done, blocked, cancelled", () => {
    const keys = getAllFeatureStatusFilterKeys();
    expect(keys).toContain("in_design");
    expect(keys).toContain("in_tdd");
    expect(keys).toContain("ready_for_implementation");
    expect(keys).toContain("in_implementation");
    expect(keys).toContain("in_handoff");
    expect(keys).toContain("done");
    expect(keys).toContain("blocked");
    expect(keys).toContain("cancelled");
  });

  it("does NOT include any Task Mode-only status", () => {
    const taskOnly = [
      "todo",
      "ready",
      "in_progress",
      "in_review",
      "reviewing",
      "in_reviewing",
      "review_passed",
      "review_incomplete",
      "change_requested",
    ];
    const keys = getAllFeatureStatusFilterKeys();
    for (const s of taskOnly) {
      expect(keys).not.toContain(s);
    }
  });

  it("preserves spec order: in_design, in_tdd, ready_for_implementation, in_implementation, in_handoff, done, blocked, cancelled", () => {
    expect(getAllFeatureStatusFilterKeys()).toEqual([
      "in_design",
      "in_tdd",
      "ready_for_implementation",
      "in_implementation",
      "in_handoff",
      "done",
      "blocked",
      "cancelled",
    ]);
  });
});

// ─── Mode filter keys via feature-status-filter module (separate file) ──────

describe("feature-status-filter module — getAllFeatureStatusFilterKeys", () => {
  it("returns the same allowlist as the status module FEATURE_MODE_STATUSES", () => {
    expect(featureFilterGetAll()).toEqual(FEATURE_MODE_STATUSES);
  });

  it("does NOT include Task Mode-only statuses", () => {
    const keys = featureFilterGetAll();
    expect(keys).not.toContain("todo");
    expect(keys).not.toContain("in_review");
    expect(keys).not.toContain("reviewing");
  });
});

// ─── isAllStatusFilterSelected — checks against TASK_MODE_STATUSES ──────────

describe("isAllStatusFilterSelected — Task Mode", () => {
  it("returns true when all 8 TASK_MODE_STATUSES are selected", () => {
    expect(isAllStatusFilterSelected([...TASK_MODE_STATUSES])).toBe(true);
  });

  it("returns false when one task mode status is missing", () => {
    const partial = TASK_MODE_STATUSES.filter((s) => s !== "reviewing");
    expect(isAllStatusFilterSelected(partial)).toBe(false);
  });

  it("returns false for an empty array", () => {
    expect(isAllStatusFilterSelected([])).toBe(false);
  });

  it("returns false when only non-canonical statuses are selected", () => {
    expect(
      isAllStatusFilterSelected(["in_reviewing", "review_passed"]),
    ).toBe(false);
  });
});

// ─── isAllFeatureStatusFilterSelected — checks against FEATURE_MODE_STATUSES ─

describe("isAllFeatureStatusFilterSelected — Feature Mode", () => {
  it("returns true when all 8 FEATURE_MODE_STATUSES are selected", () => {
    expect(isAllFeatureStatusFilterSelected([...FEATURE_MODE_STATUSES])).toBe(
      true,
    );
  });

  it("returns false when one feature mode status is missing", () => {
    const partial = FEATURE_MODE_STATUSES.filter((s) => s !== "in_handoff");
    expect(isAllFeatureStatusFilterSelected(partial)).toBe(false);
  });

  it("returns false for an empty array", () => {
    expect(isAllFeatureStatusFilterSelected([])).toBe(false);
  });

  it("returns false for an array of task-mode-only statuses", () => {
    expect(
      isAllFeatureStatusFilterSelected(["todo", "ready", "in_progress"]),
    ).toBe(false);
  });
});

// ─── isAllFeatureStatusFilterSelected via feature-status-filter module ───────

describe("feature-status-filter module — isAllFeatureStatusFilterSelected", () => {
  it("returns true when all FEATURE_MODE_STATUSES are selected", () => {
    expect(featureFilterIsAll([...FEATURE_MODE_STATUSES])).toBe(true);
  });

  it("returns false for a partial selection", () => {
    expect(featureFilterIsAll(["in_design", "blocked"])).toBe(false);
  });
});

// ─── toggleAllStatusFilter — selects/deselects TASK_MODE_STATUSES ────────────

describe("toggleAllStatusFilter — Task Mode", () => {
  it("selects all TASK_MODE_STATUSES when none are selected", () => {
    expect(toggleAllStatusFilter([])).toEqual([...TASK_MODE_STATUSES]);
  });

  it("deselects all when all TASK_MODE_STATUSES are selected", () => {
    expect(toggleAllStatusFilter([...TASK_MODE_STATUSES])).toEqual([]);
  });

  it("selects all when only some statuses are selected", () => {
    expect(toggleAllStatusFilter(["todo", "ready"])).toEqual([
      ...TASK_MODE_STATUSES,
    ]);
  });

  it("selected result contains no non-canonical statuses", () => {
    const result = toggleAllStatusFilter([]);
    expect(result).not.toContain("in_reviewing");
    expect(result).not.toContain("review_passed");
    expect(result).not.toContain("review_incomplete");
    expect(result).not.toContain("change_requested");
  });
});

// ─── toggleAllFeatureStatusFilter — selects/deselects FEATURE_MODE_STATUSES ─

describe("toggleAllFeatureStatusFilter — Feature Mode", () => {
  it("selects all FEATURE_MODE_STATUSES when none are selected", () => {
    expect(toggleAllFeatureStatusFilter([])).toEqual([...FEATURE_MODE_STATUSES]);
  });

  it("deselects all when all FEATURE_MODE_STATUSES are selected", () => {
    expect(toggleAllFeatureStatusFilter([...FEATURE_MODE_STATUSES])).toEqual(
      [],
    );
  });

  it("selects all when only some statuses are selected", () => {
    expect(toggleAllFeatureStatusFilter(["in_design"])).toEqual([
      ...FEATURE_MODE_STATUSES,
    ]);
  });

  it("selected result contains no Task Mode-only statuses", () => {
    const result = toggleAllFeatureStatusFilter([]);
    expect(result).not.toContain("todo");
    expect(result).not.toContain("ready");
    expect(result).not.toContain("in_progress");
    expect(result).not.toContain("in_review");
    expect(result).not.toContain("reviewing");
    expect(result).not.toContain("in_reviewing");
  });
});

// ─── toggleAllFeatureStatusFilter via feature-status-filter module ───────────

describe("feature-status-filter module — toggleAllFeatureStatusFilter", () => {
  it("selects FEATURE_MODE_STATUSES when toggling from empty", () => {
    expect(featureFilterToggleAll([])).toEqual([...FEATURE_MODE_STATUSES]);
  });

  it("clears when toggling from all selected", () => {
    expect(featureFilterToggleAll([...FEATURE_MODE_STATUSES])).toEqual([]);
  });
});

// ─── Default filter values — both modes exclude 'done' ───────────────────────

describe("getDefaultStatusFilter — Task Mode default", () => {
  it("returns all TASK_MODE_STATUSES except done", () => {
    const defaults = getDefaultStatusFilter();
    const expected = TASK_MODE_STATUSES.filter((s) => s !== "done");
    expect(defaults).toEqual(expected);
  });

  it("does NOT contain done", () => {
    expect(getDefaultStatusFilter()).not.toContain("done");
  });

  it("contains exactly 7 statuses", () => {
    expect(getDefaultStatusFilter()).toHaveLength(7);
  });

  it("does NOT contain any non-canonical status", () => {
    const defaults = getDefaultStatusFilter();
    expect(defaults).not.toContain("in_reviewing");
    expect(defaults).not.toContain("review_passed");
    expect(defaults).not.toContain("review_incomplete");
    expect(defaults).not.toContain("change_requested");
  });
});

describe("getDefaultFeatureStatusFilter — Feature Mode default (status-filter-store)", () => {
  it("returns all FEATURE_MODE_STATUSES except done", () => {
    const defaults = getDefaultFeatureStatusFilter();
    const expected = FEATURE_MODE_STATUSES.filter((s) => s !== "done");
    expect(defaults).toEqual(expected);
  });

  it("does NOT contain done", () => {
    expect(getDefaultFeatureStatusFilter()).not.toContain("done");
  });

  it("contains exactly 7 statuses", () => {
    expect(getDefaultFeatureStatusFilter()).toHaveLength(7);
  });

  it("does NOT contain Task Mode-only statuses", () => {
    const defaults = getDefaultFeatureStatusFilter();
    expect(defaults).not.toContain("todo");
    expect(defaults).not.toContain("ready");
    expect(defaults).not.toContain("in_progress");
    expect(defaults).not.toContain("in_review");
    expect(defaults).not.toContain("reviewing");
  });
});

describe("getDefaultFeatureStatusFilter — Feature Mode default (feature-status-filter-store)", () => {
  it("returns all FEATURE_MODE_STATUSES except done", () => {
    const defaults = featureStoreGetDefault();
    const expected = FEATURE_MODE_STATUSES.filter((s) => s !== "done");
    expect(defaults).toEqual(expected);
  });

  it("does NOT contain done", () => {
    expect(featureStoreGetDefault()).not.toContain("done");
  });
});

// ─── Stale state rejection — stored non-canonical values are discarded ────────

describe("Stale stored Task Mode filter — rejection of excluded statuses", () => {
  it("rejects a stored filter containing the non-canonical in_reviewing", () => {
    mockLS.setItem(
      "dashboard:board-status-filter",
      JSON.stringify(["todo", "in_reviewing"]),
    );
    expect(getStoredStatusFilter()).toBeNull();
  });

  it("rejects a stored filter containing review_passed", () => {
    mockLS.setItem(
      "dashboard:board-status-filter",
      JSON.stringify(["todo", "review_passed"]),
    );
    expect(getStoredStatusFilter()).toBeNull();
  });

  it("rejects a stored filter containing review_incomplete", () => {
    mockLS.setItem(
      "dashboard:board-status-filter",
      JSON.stringify(["todo", "review_incomplete"]),
    );
    expect(getStoredStatusFilter()).toBeNull();
  });

  it("rejects a stored filter containing change_requested", () => {
    mockLS.setItem(
      "dashboard:board-status-filter",
      JSON.stringify(["in_progress", "change_requested"]),
    );
    expect(getStoredStatusFilter()).toBeNull();
  });

  it("rejects a stored filter containing a Feature Mode-only status", () => {
    mockLS.setItem(
      "dashboard:board-status-filter",
      JSON.stringify(["todo", "in_design"]),
    );
    expect(getStoredStatusFilter()).toBeNull();
  });

  it("accepts a valid task mode filter", () => {
    saveStatusFilter(["todo", "in_review", "reviewing"]);
    expect(getStoredStatusFilter()).toEqual(["todo", "in_review", "reviewing"]);
  });
});

describe("Stale stored Feature Mode filter — rejection of excluded statuses", () => {
  it("rejects a stored filter containing a Task Mode-only status (todo)", () => {
    mockLS.setItem(
      "dashboard:board-feature-status-filter",
      JSON.stringify(["in_design", "todo"]),
    );
    expect(getStoredFeatureStatusFilter()).toBeNull();
  });

  it("rejects a stored filter containing in_review (task-only)", () => {
    mockLS.setItem(
      "dashboard:board-feature-status-filter",
      JSON.stringify(["in_design", "in_review"]),
    );
    expect(getStoredFeatureStatusFilter()).toBeNull();
  });

  it("rejects a stored filter containing reviewing (task-only)", () => {
    mockLS.setItem(
      "dashboard:board-feature-status-filter",
      JSON.stringify(["in_design", "reviewing"]),
    );
    expect(getStoredFeatureStatusFilter()).toBeNull();
  });

  it("rejects a stored filter containing the non-canonical in_reviewing", () => {
    mockLS.setItem(
      "dashboard:board-feature-status-filter",
      JSON.stringify(["in_design", "in_reviewing"]),
    );
    expect(getStoredFeatureStatusFilter()).toBeNull();
  });

  it("accepts a valid feature mode filter", () => {
    saveFeatureStatusFilter(["in_design", "in_implementation", "blocked"]);
    expect(getStoredFeatureStatusFilter()).toEqual([
      "in_design",
      "in_implementation",
      "blocked",
    ]);
  });
});

describe("Stale stored Feature Mode filter — rejection via feature-status-filter-store", () => {
  it("rejects a stored filter with task-only statuses", () => {
    mockLS.setItem(
      "dashboard:board-feature-status-filter",
      JSON.stringify(["in_design", "in_progress"]),
    );
    expect(featureStoreGetStored()).toBeNull();
  });

  it("accepts a valid feature filter through feature-status-filter-store", () => {
    featureStoreSave(["in_design", "done"]);
    expect(featureStoreGetStored()).toEqual(["in_design", "done"]);
  });
});

// ─── Filter state isolation ────────────────────────────────────────────────

describe("Filter state isolation between modes", () => {
  it("task filter and feature filter use independent storage keys", () => {
    saveStatusFilter(["todo", "in_review"]);
    saveFeatureStatusFilter(["in_design", "blocked"]);

    expect(getStoredStatusFilter()).toEqual(["todo", "in_review"]);
    expect(getStoredFeatureStatusFilter()).toEqual(["in_design", "blocked"]);
  });

  it("a task-mode filter selection does not appear in feature-mode filter reads", () => {
    saveStatusFilter(["in_review", "reviewing"]);
    expect(getStoredFeatureStatusFilter()).toBeNull();
  });

  it("a feature-mode filter selection does not appear in task-mode filter reads", () => {
    saveFeatureStatusFilter(["in_design", "in_implementation"]);
    expect(getStoredStatusFilter()).toBeNull();
  });

  it("Task Mode toggleAll result does not contain Feature Mode-only statuses", () => {
    const taskAll = toggleAllStatusFilter([]);
    const featureOnly = [
      "in_design",
      "in_tdd",
      "ready_for_implementation",
      "in_implementation",
      "in_handoff",
    ];
    for (const s of featureOnly) {
      expect(taskAll).not.toContain(s);
    }
  });

  it("Feature Mode toggleAll result does not contain Task Mode-only statuses", () => {
    const featureAll = toggleAllFeatureStatusFilter([]);
    const taskOnly = ["todo", "ready", "in_progress", "in_review", "reviewing"];
    for (const s of taskOnly) {
      expect(featureAll).not.toContain(s);
    }
  });
});
