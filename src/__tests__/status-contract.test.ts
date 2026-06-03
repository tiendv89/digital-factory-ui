import { describe, it, expect } from "vitest";
import {
  TASK_MODE_STATUSES,
  FEATURE_MODE_STATUSES,
  STATUS_COLUMNS,
  FEATURE_STATUS_OPTIONS,
  getTaskStatusLabel,
  type TaskStatus,
  type FeatureStatus,
} from "../features/board/lib/status";

// ─── Label/value mapping ────────────────────────────────────────────────────

describe("getTaskStatusLabel — shared status label contract", () => {
  it("maps in_review → 'In Review'", () => {
    expect(getTaskStatusLabel("in_review")).toBe("In Review");
  });

  it("maps reviewing → 'In Reviewing'", () => {
    expect(getTaskStatusLabel("reviewing")).toBe("In Reviewing");
  });

  it("does NOT use 'in_reviewing' as a status value for In Reviewing", () => {
    // in_reviewing is non-canonical; reviewing is the correct value
    expect(getTaskStatusLabel("reviewing")).toBe("In Reviewing");
    expect(getTaskStatusLabel("in_reviewing")).not.toBe("In Reviewing");
  });

  it("returns a human-readable fallback for unknown statuses", () => {
    expect(getTaskStatusLabel("some_status")).toBe("some status");
  });

  it("maps all Task Mode statuses to non-empty labels", () => {
    for (const status of TASK_MODE_STATUSES) {
      expect(getTaskStatusLabel(status)).toBeTruthy();
    }
  });
});

// ─── TASK_MODE_STATUSES — canonical Task Mode allowlist ─────────────────────

describe("TASK_MODE_STATUSES — canonical Task Mode kanban allowlist", () => {
  it("contains exactly 8 statuses", () => {
    expect(TASK_MODE_STATUSES).toHaveLength(8);
  });

  it("lists statuses in spec order: todo, ready, in_progress, blocked, in_review, reviewing, done, cancelled", () => {
    expect(TASK_MODE_STATUSES).toEqual([
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

  it("includes in_review (distinct from reviewing)", () => {
    expect(TASK_MODE_STATUSES).toContain("in_review");
  });

  it("includes reviewing (distinct from in_review)", () => {
    expect(TASK_MODE_STATUSES).toContain("reviewing");
  });

  it("does NOT include the non-canonical in_reviewing value", () => {
    expect(TASK_MODE_STATUSES).not.toContain("in_reviewing");
  });

  it("does NOT include review_passed", () => {
    expect(TASK_MODE_STATUSES).not.toContain("review_passed");
  });

  it("does NOT include review_incomplete", () => {
    expect(TASK_MODE_STATUSES).not.toContain("review_incomplete");
  });

  it("does NOT include change_requested", () => {
    expect(TASK_MODE_STATUSES).not.toContain("change_requested");
  });

  it("does NOT include any Feature Mode-only status", () => {
    const featureOnly: FeatureStatus[] = [
      "in_design",
      "in_tdd",
      "ready_for_implementation",
      "in_implementation",
      "in_handoff",
    ];
    for (const status of featureOnly) {
      expect(TASK_MODE_STATUSES).not.toContain(status);
    }
  });

  it("every entry is assignable to TaskStatus", () => {
    for (const status of TASK_MODE_STATUSES) {
      const _s: TaskStatus = status;
      expect(typeof _s).toBe("string");
    }
  });
});

// ─── FEATURE_MODE_STATUSES — canonical Feature Mode allowlist ───────────────

describe("FEATURE_MODE_STATUSES — canonical Feature Mode kanban allowlist", () => {
  it("contains exactly 8 statuses", () => {
    expect(FEATURE_MODE_STATUSES).toHaveLength(8);
  });

  it("lists statuses in spec order: in_design, in_tdd, ready_for_implementation, in_implementation, in_handoff, done, blocked, cancelled", () => {
    expect(FEATURE_MODE_STATUSES).toEqual([
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

  it("does NOT include any Task Mode-only status", () => {
    const taskOnly = ["todo", "ready", "in_progress", "in_review", "reviewing"];
    for (const status of taskOnly) {
      expect(FEATURE_MODE_STATUSES).not.toContain(status);
    }
  });

  it("every entry is assignable to FeatureStatus", () => {
    for (const status of FEATURE_MODE_STATUSES) {
      const _s: FeatureStatus = status;
      expect(typeof _s).toBe("string");
    }
  });
});

// ─── STATUS_COLUMNS matches TASK_MODE_STATUSES ──────────────────────────────

describe("STATUS_COLUMNS alignment with TASK_MODE_STATUSES", () => {
  it("STATUS_COLUMNS keys match TASK_MODE_STATUSES exactly", () => {
    expect(STATUS_COLUMNS.map((c) => c.key)).toEqual(TASK_MODE_STATUSES);
  });

  it("in_review column has label 'In Review'", () => {
    const col = STATUS_COLUMNS.find((c) => c.key === "in_review");
    expect(col?.label).toBe("In Review");
  });

  it("reviewing column has label 'In Reviewing'", () => {
    const col = STATUS_COLUMNS.find((c) => c.key === "reviewing");
    expect(col?.label).toBe("In Reviewing");
  });

  it("no column uses the non-canonical in_reviewing key", () => {
    expect(STATUS_COLUMNS.map((c) => c.key)).not.toContain("in_reviewing");
  });
});

// ─── FEATURE_STATUS_OPTIONS matches FEATURE_MODE_STATUSES ──────────────────

describe("FEATURE_STATUS_OPTIONS alignment with FEATURE_MODE_STATUSES", () => {
  it("FEATURE_STATUS_OPTIONS keys match FEATURE_MODE_STATUSES exactly", () => {
    expect(FEATURE_STATUS_OPTIONS.map((o) => o.key)).toEqual(
      FEATURE_MODE_STATUSES,
    );
  });
});

// ─── Mode separation — allowlists do not bleed across modes ─────────────────

describe("mode separation — Task Mode and Feature Mode allowlists are disjoint for mode-exclusive statuses", () => {
  it("task-only statuses are absent from Feature Mode", () => {
    const taskOnly = ["todo", "ready", "in_progress", "in_review", "reviewing"];
    const featureKeys = new Set(FEATURE_MODE_STATUSES);
    for (const s of taskOnly) {
      expect(featureKeys.has(s as FeatureStatus)).toBe(false);
    }
  });

  it("feature-only statuses are absent from Task Mode", () => {
    const featureOnly = [
      "in_design",
      "in_tdd",
      "ready_for_implementation",
      "in_implementation",
      "in_handoff",
    ];
    const taskKeys = new Set(TASK_MODE_STATUSES);
    for (const s of featureOnly) {
      expect(taskKeys.has(s as TaskStatus)).toBe(false);
    }
  });
});
