import { describe, it, expect } from "vitest";
import {
  computeStatusAge,
  formatStatusAgeDuration,
  findStatusLogEntry,
} from "../lib/time";
import { groupTrackedTasks } from "../features/board/components/TaskTrackingPanel/groupTasks";
import { TRACKED_SECTIONS } from "../features/board/components/TaskTrackingPanel/TaskTrackingPanel.types";
import type { ParsedFeature, ParsedTask } from "../services/yaml-parser";

const makeTask = (
  id: string,
  status: string,
  overrides: Partial<ParsedTask> = {},
): ParsedTask => ({
  id,
  title: `Task ${id}`,
  status,
  dependsOn: [],
  ...overrides,
});

const makeFeature = (id: string, tasks: ParsedTask[]): ParsedFeature => ({
  id,
  title: `Feature ${id}`,
  featureStatus: "in_implementation",
  tasks,
});

// ─── formatStatusAgeDuration ──────────────────────────────────────────────────

describe("formatStatusAgeDuration", () => {
  it("formats seconds for sub-minute elapsed", () => {
    expect(formatStatusAgeDuration(0)).toBe("0s");
    expect(formatStatusAgeDuration(30_000)).toBe("30s");
    expect(formatStatusAgeDuration(59_000)).toBe("59s");
  });

  it("formats minutes for sub-hour elapsed", () => {
    expect(formatStatusAgeDuration(60_000)).toBe("1m");
    expect(formatStatusAgeDuration(90_000)).toBe("1m");
    expect(formatStatusAgeDuration(59 * 60_000)).toBe("59m");
  });

  it("formats hours for sub-day elapsed", () => {
    expect(formatStatusAgeDuration(60 * 60_000)).toBe("1h");
    expect(formatStatusAgeDuration(5 * 60 * 60_000)).toBe("5h");
    expect(formatStatusAgeDuration(23 * 60 * 60_000)).toBe("23h");
  });

  it("formats days for >= 24 hours elapsed", () => {
    expect(formatStatusAgeDuration(24 * 60 * 60_000)).toBe("1d");
    expect(formatStatusAgeDuration(3 * 24 * 60 * 60_000)).toBe("3d");
  });

  it("returns em-dash for negative elapsed", () => {
    expect(formatStatusAgeDuration(-1)).toBe("—");
  });
});

// ─── computeStatusAge ─────────────────────────────────────────────────────────

describe("computeStatusAge", () => {
  it("computes age from the matching status log entry", () => {
    const now = new Date("2026-05-27T10:00:00Z");
    const task = makeTask("T1", "in_progress", {
      log: [{ action: "started", by: "u@e.com", at: "2026-05-27T08:00:00Z" }],
    });
    expect(computeStatusAge(task, now)).toBe("2h");
  });

  it("computes age for blocked status using blocked log action", () => {
    const now = new Date("2026-05-27T12:00:00Z");
    const task = makeTask("T1", "blocked", {
      log: [{ action: "blocked", by: "u@e.com", at: "2026-05-27T11:00:00Z" }],
    });
    expect(computeStatusAge(task, now)).toBe("1h");
  });

  it("falls back to last log entry when no matching action found", () => {
    const now = new Date("2026-05-27T12:00:00Z");
    const task = makeTask("T1", "in_progress", {
      log: [{ action: "created", by: "u@e.com", at: "2026-05-27T11:30:00Z" }],
    });
    expect(computeStatusAge(task, now)).toBe("30m");
  });

  it("falls back to execution.last_updated_at when log is empty", () => {
    const now = new Date("2026-05-27T13:00:00Z");
    const task = makeTask("T1", "in_progress", {
      execution: { actor_type: "agent", last_updated_at: "2026-05-27T12:00:00Z" },
    });
    expect(computeStatusAge(task, now)).toBe("1h");
  });

  it("returns em-dash when no timestamp is available", () => {
    const task = makeTask("T1", "in_progress");
    expect(computeStatusAge(task)).toBe("—");
  });

  it("returns em-dash when all timestamps are invalid", () => {
    const task = makeTask("T1", "in_progress", {
      log: [{ action: "started", by: "u@e.com", at: "not-a-date" }],
      execution: { actor_type: "agent", last_updated_at: "also-not-a-date" },
    });
    expect(computeStatusAge(task)).toBe("—");
  });
});

// ─── findStatusLogEntry: blocked action ───────────────────────────────────────

describe("findStatusLogEntry — blocked", () => {
  it("finds the most recent blocked log entry", () => {
    const log = [
      { action: "started", by: "u@e.com", at: "2026-05-01T00:00:00Z" },
      { action: "blocked", by: "u@e.com", at: "2026-05-02T00:00:00Z" },
    ];
    const entry = findStatusLogEntry(log, "blocked");
    expect(entry?.at).toBe("2026-05-02T00:00:00Z");
  });

  it("picks the latest occurrence when blocked action repeats", () => {
    const log = [
      { action: "blocked", by: "u@e.com", at: "2026-05-01T00:00:00Z" },
      { action: "ready", by: "u@e.com", at: "2026-05-02T00:00:00Z" },
      { action: "blocked", by: "u@e.com", at: "2026-05-05T00:00:00Z" },
    ];
    expect(findStatusLogEntry(log, "blocked")?.at).toBe("2026-05-05T00:00:00Z");
  });
});

// ─── TRACKED_SECTIONS — includes blocked ──────────────────────────────────────

describe("TRACKED_SECTIONS — includes blocked at the top", () => {
  it("has blocked as the first section", () => {
    expect(TRACKED_SECTIONS[0].status).toBe("blocked");
    expect(TRACKED_SECTIONS[0].label).toBe("BLOCKED");
  });

  it("contains 4 sections total", () => {
    expect(TRACKED_SECTIONS).toHaveLength(4);
  });
});

// ─── groupTrackedTasks — blocked bucket ───────────────────────────────────────

describe("groupTrackedTasks — blocked section", () => {
  it("places blocked tasks in the blocked section at index 0", () => {
    const feature = makeFeature("auth", [
      makeTask("T1", "blocked", { blockedReason: "Waiting for API" }),
      makeTask("T2", "in_progress"),
    ]);
    const sections = groupTrackedTasks([feature]);

    expect(sections[0].status).toBe("blocked");
    expect(sections[0].items).toHaveLength(1);
    expect(sections[0].items[0].task.id).toBe("T1");

    expect(sections[1].status).toBe("in_progress");
    expect(sections[1].items).toHaveLength(1);
  });

  it("keeps todo and done tasks out of the blocked section", () => {
    const feature = makeFeature("auth", [
      makeTask("T1", "todo"),
      makeTask("T2", "done"),
    ]);
    const sections = groupTrackedTasks([feature]);
    const blocked = sections.find((s) => s.status === "blocked")!;
    expect(blocked.items).toHaveLength(0);
  });

  it("applies search query to blocked tasks", () => {
    const feature = makeFeature("auth", [
      makeTask("T1", "blocked", { title: "JWT token blocked" }),
      makeTask("T2", "blocked", { title: "Setup database" }),
    ]);
    const sections = groupTrackedTasks([feature], "jwt");
    const blocked = sections.find((s) => s.status === "blocked")!;
    expect(blocked.items).toHaveLength(1);
    expect(blocked.items[0].task.id).toBe("T1");
  });

  it("applies active status filter to exclude blocked section", () => {
    const feature = makeFeature("auth", [
      makeTask("T1", "blocked"),
      makeTask("T2", "ready"),
    ]);
    const sections = groupTrackedTasks([feature], "", { statuses: ["ready"] });
    const blocked = sections.find((s) => s.status === "blocked")!;
    const ready = sections.find((s) => s.status === "ready")!;
    expect(blocked.items).toHaveLength(0);
    expect(ready.items).toHaveLength(1);
  });
});

