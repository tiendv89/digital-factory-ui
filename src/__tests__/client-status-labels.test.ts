import { describe, it, expect } from "vitest";
import {
  clientStatusLabel,
  clientFeatureStatusLabel,
} from "../features/board/lib/status";

// ─── Task status mapping ─────────────────────────────────────────────────────

describe("clientStatusLabel", () => {
  const EXPECTED: Array<[string, string]> = [
    ["todo", "Not started"],
    ["ready", "Ready"],
    ["in_progress", "In progress"],
    ["in_review", "In review"],
    ["reviewing", "In review"],
    ["review_passed", "In review"],
    ["change_requested", "Revisions in progress"],
    ["review_incomplete", "In review"],
    ["blocked", "Blocked"],
    ["done", "Done"],
    ["cancelled", "Cancelled"],
  ];

  it("covers all 11 task statuses", () => {
    expect(EXPECTED).toHaveLength(11);
  });

  for (const [status, expected] of EXPECTED) {
    it(`maps "${status}" → "${expected}"`, () => {
      expect(clientStatusLabel(status)).toBe(expected);
    });
  }

  it("collapses reviewing, review_passed, review_incomplete to 'In review'", () => {
    expect(clientStatusLabel("reviewing")).toBe("In review");
    expect(clientStatusLabel("review_passed")).toBe("In review");
    expect(clientStatusLabel("review_incomplete")).toBe("In review");
  });

  it("falls back gracefully for unknown statuses", () => {
    expect(clientStatusLabel("unknown_status")).toBe("unknown status");
    expect(clientStatusLabel("")).toBe("");
  });
});

// ─── Feature status mapping ──────────────────────────────────────────────────

describe("clientFeatureStatusLabel", () => {
  const EXPECTED: Array<[string, string]> = [
    ["in_design", "Design"],
    ["in_tdd", "Technical design"],
    ["ready_for_implementation", "Ready to build"],
    ["in_implementation", "Building"],
    ["in_handoff", "Handoff"],
    ["done", "Done"],
    ["blocked", "Blocked"],
    ["cancelled", "Cancelled"],
  ];

  it("covers all 8 feature statuses", () => {
    expect(EXPECTED).toHaveLength(8);
  });

  for (const [status, expected] of EXPECTED) {
    it(`maps "${status}" → "${expected}"`, () => {
      expect(clientFeatureStatusLabel(status)).toBe(expected);
    });
  }

  it("falls back gracefully for unknown statuses", () => {
    expect(clientFeatureStatusLabel("unknown_feature_status")).toBe(
      "unknown feature status",
    );
  });
});
