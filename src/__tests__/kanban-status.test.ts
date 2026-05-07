import { describe, it, expect } from "vitest";
import {
  STATUS_COLUMNS,
  getStatusColor,
  getNextAction,
  getFeatureStatusColor,
  getFeatureStatusLabel,
} from "../features/board/lib/status";

describe("STATUS_COLUMNS", () => {
  it("defines exactly 7 columns", () => {
    expect(STATUS_COLUMNS).toHaveLength(7);
  });

  it("contains the canonical task statuses in order", () => {
    const keys = STATUS_COLUMNS.map((c) => c.key);
    expect(keys).toEqual([
      "todo",
      "ready",
      "in_progress",
      "blocked",
      "in_review",
      "done",
      "cancelled",
    ]);
  });

  it("every column has a non-empty label and valid hex color", () => {
    for (const col of STATUS_COLUMNS) {
      expect(col.label).toBeTruthy();
      expect(col.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe("getStatusColor", () => {
  it("returns the colour for known statuses", () => {
    expect(getStatusColor("todo")).toBe("#3274b4");
    expect(getStatusColor("ready")).toBe("#6e6de7");
    expect(getStatusColor("in_progress")).toBe("#e08500");
    expect(getStatusColor("blocked")).toBe("#e62a34");
    expect(getStatusColor("in_review")).toBe("#8e67cb");
    expect(getStatusColor("done")).toBe("#009252");
    expect(getStatusColor("cancelled")).toBe("#5c636e");
  });

  it("returns a fallback colour for unknown statuses", () => {
    const color = getStatusColor("unknown_status");
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe("getNextAction", () => {
  it("returns a non-empty action string for each canonical status", () => {
    const statuses = [
      "todo",
      "ready",
      "in_progress",
      "blocked",
      "in_review",
      "done",
      "cancelled",
    ];
    for (const status of statuses) {
      expect(getNextAction(status)).toBeTruthy();
    }
  });

  it("returns empty string for unknown status", () => {
    expect(getNextAction("unknown_xyz")).toBe("");
  });

  it("maps status → meaningful action label", () => {
    expect(getNextAction("ready")).toContain("Claim");
    expect(getNextAction("in_progress")).toContain("review");
    expect(getNextAction("blocked")).toContain("Resolve");
  });
});

describe("getFeatureStatusColor", () => {
  it("returns a valid hex color for known feature statuses", () => {
    const statuses = [
      "in_design",
      "in_tdd",
      "ready_for_implementation",
      "in_implementation",
      "in_handoff",
      "done",
      "blocked",
      "cancelled",
    ];
    for (const status of statuses) {
      expect(getFeatureStatusColor(status)).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("returns a fallback for unknown statuses", () => {
    expect(getFeatureStatusColor("some_future_status")).toMatch(
      /^#[0-9a-fA-F]{6}$/,
    );
  });
});

describe("getFeatureStatusLabel", () => {
  it("returns human-readable label for known feature statuses", () => {
    expect(getFeatureStatusLabel("in_implementation")).toBe("In Progress");
    expect(getFeatureStatusLabel("ready_for_implementation")).toBe("Ready");
    expect(getFeatureStatusLabel("in_handoff")).toBe("In Handoff");
    expect(getFeatureStatusLabel("done")).toBe("Done");
  });

  it("falls back to the raw status string for unknown values", () => {
    expect(getFeatureStatusLabel("some_unknown_state")).toBe(
      "some_unknown_state",
    );
  });
});
