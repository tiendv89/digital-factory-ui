import { describe, it, expect } from "vitest";
import {
  FEATURE_STATUS_OPTIONS,
  isValidFeatureStatus,
  normalizeFeatureStatus,
  getFeatureStatusLabel,
  getFeatureStatusColor,
  type FeatureStatus,
} from "../features/board/lib/status";

// ─── Allowed feature lifecycle statuses per T6 spec ─────────────────────────

const ALL_VALID_FEATURE_STATUSES: FeatureStatus[] = [
  "in_design",
  "in_tdd",
  "ready_for_implementation",
  "in_implementation",
  "in_handoff",
  "done",
  "blocked",
  "cancelled",
];

// ─── Task lifecycle statuses that must NOT appear as feature status ─────────

const TASK_STATUSES_THAT_MUST_NOT_APPEAR = [
  "todo",
  "ready",
  "in_progress",
  "in_review",
];

// ─── isValidFeatureStatus ───────────────────────────────────────────────────

describe("isValidFeatureStatus — validates feature lifecycle statuses", () => {
  it.each(ALL_VALID_FEATURE_STATUSES)(
    "accepts '%s' as a valid feature lifecycle status",
    (status: string) => {
      expect(isValidFeatureStatus(status)).toBe(true);
    },
  );

  it.each(TASK_STATUSES_THAT_MUST_NOT_APPEAR)(
    "rejects task status '%s' — must not be treated as a feature lifecycle status",
    (status: string) => {
      expect(isValidFeatureStatus(status)).toBe(false);
    },
  );

  it("rejects 'unknown'", () => {
    expect(isValidFeatureStatus("unknown")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidFeatureStatus("")).toBe(false);
  });

  it("rejects arbitrary strings", () => {
    expect(isValidFeatureStatus("random_value")).toBe(false);
    expect(isValidFeatureStatus("in_development")).toBe(false);
    expect(isValidFeatureStatus("pending")).toBe(false);
  });
});

// ─── normalizeFeatureStatus ─────────────────────────────────────────────────

describe("normalizeFeatureStatus — normalizes to a valid FeatureStatus", () => {
  it.each(ALL_VALID_FEATURE_STATUSES)(
    "returns '%s' unchanged when already valid",
    (status: string) => {
      expect(normalizeFeatureStatus(status)).toBe(status);
    },
  );

  it.each(TASK_STATUSES_THAT_MUST_NOT_APPEAR)(
    "maps task status '%s' to 'in_design' (safe default), not a task-derived label",
    (status: string) => {
      const normalized = normalizeFeatureStatus(status);
      expect(normalized).toBe("in_design");
      // Must NOT return the raw task status or a task-derived value
      expect(normalized).not.toBe(status);
      // Must NOT return any other feature lifecycle status that could be
      // confused with a task-derived mapping
      const allowed: string[] = [...ALL_VALID_FEATURE_STATUSES];
      expect(allowed).toContain(normalized);
    },
  );

  it("maps 'unknown' to 'in_design'", () => {
    expect(normalizeFeatureStatus("unknown")).toBe("in_design");
  });

  it("maps empty string to 'in_design'", () => {
    expect(normalizeFeatureStatus("")).toBe("in_design");
  });

  it("returns 'in_design' for any unrecognized status", () => {
    expect(normalizeFeatureStatus("some_future_status")).toBe("in_design");
    expect(normalizeFeatureStatus("random")).toBe("in_design");
  });
});

// ─── FEATURE_STATUS_OPTIONS — completeness and ordering ────────────────────

describe("FEATURE_STATUS_OPTIONS — canonical feature status column list", () => {
  it("contains exactly 8 feature lifecycle statuses", () => {
    expect(FEATURE_STATUS_OPTIONS).toHaveLength(8);
  });

  it("lists every allowed feature lifecycle status", () => {
    const keys = FEATURE_STATUS_OPTIONS.map((o) => o.key);
    for (const status of ALL_VALID_FEATURE_STATUSES) {
      expect(keys).toContain(status);
    }
  });

  it("does NOT include any task lifecycle status", () => {
    const keys = FEATURE_STATUS_OPTIONS.map((o) => o.key);
    for (const taskStatus of TASK_STATUSES_THAT_MUST_NOT_APPEAR) {
      expect(keys).not.toContain(taskStatus);
    }
  });

  it("every option has a non-empty label and valid hex color", () => {
    for (const opt of FEATURE_STATUS_OPTIONS) {
      expect(opt.label).toBeTruthy();
      expect(opt.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("every option key is a valid FeatureStatus", () => {
    for (const opt of FEATURE_STATUS_OPTIONS) {
      expect(isValidFeatureStatus(opt.key)).toBe(true);
    }
  });

  it("is ordered: design → tdd → ready → implement → handoff → done → blocked → cancelled", () => {
    const keys = FEATURE_STATUS_OPTIONS.map((o) => o.key);
    expect(keys).toEqual([
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

// ─── getFeatureStatusLabel — human-readable display ─────────────────────────

describe("getFeatureStatusLabel", () => {
  it.each([
    ["in_design", "In Design"],
    ["in_tdd", "In TDD"],
    ["ready_for_implementation", "Ready"],
    ["in_implementation", "In Progress"],
    ["in_handoff", "Handoff"],
    ["done", "Done"],
    ["blocked", "Blocked"],
    ["cancelled", "Cancelled"],
  ] as const)("maps '%s' → '%s'", (status: string, expected: string) => {
    expect(getFeatureStatusLabel(status)).toBe(expected);
  });

  it.each(TASK_STATUSES_THAT_MUST_NOT_APPEAR)(
    "does NOT have a feature-label mapping for task status '%s' — returns 'Unknown'",
    (status: string) => {
      const label = getFeatureStatusLabel(status);
      // Returns "Unknown" for non-feature-lifecycle values (defense in depth)
      expect(label).toBe("Unknown");
      // Must not be a human-readable feature status label
      const featureLabels = FEATURE_STATUS_OPTIONS.map((o) => o.label);
      expect(featureLabels).not.toContain(label);
    },
  );
});

// ─── getFeatureStatusColor — color mapping ─────────────────────────────────

describe("getFeatureStatusColor", () => {
  it.each(ALL_VALID_FEATURE_STATUSES)(
    "returns a valid hex color for '%s'",
    (status: string) => {
      expect(getFeatureStatusColor(status)).toMatch(/^#[0-9a-fA-F]{6}$/);
    },
  );

  it.each(TASK_STATUSES_THAT_MUST_NOT_APPEAR)(
    "returns a fallback color (not feature-status-mapped) for task status '%s'",
    (status: string) => {
      const color = getFeatureStatusColor(status);
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      // Must be the generic fallback, not any feature status color
      expect(color).toBe("#8892b5");
    },
  );

  it("returns fallback color for unknown status", () => {
    expect(getFeatureStatusColor("unknown")).toBe("#8892b5");
  });
});

// ─── TypeScript type narrowing — FeatureStatus union ────────────────────────

describe("FeatureStatus type union — exhaustive check", () => {
  it("covers exactly 8 members", () => {
    // This test is a compile-time guard; at runtime it just confirms
    // the ALL_VALID_FEATURE_STATUSES list is complete.
    const count = ALL_VALID_FEATURE_STATUSES.length;
    expect(count).toBe(8);
  });

  it("every FEATURE_STATUS_OPTIONS key is assignable to FeatureStatus", () => {
    for (const opt of FEATURE_STATUS_OPTIONS) {
      const status: FeatureStatus = opt.key;
      expect(status).toBe(opt.key);
    }
  });
});
