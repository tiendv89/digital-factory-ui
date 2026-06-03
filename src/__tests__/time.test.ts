import { describe, it, expect } from "vitest";
import {
  computeLastUpdatedLabel,
  computeStatusAge,
  findStatusLogEntry,
  formatElapsed,
  formatLastUpdatedLabel,
  formatTimestamp,
  getElapsedSinceStatus,
  getFeatureLastModifiedAt,
  isTodayTimestamp,
} from "../lib/time";
import type { LogEntry, ParsedFeature } from "../services/yaml-parser";

const makeEntry = (action: string, at: string, by = "u@e.com"): LogEntry => ({
  action,
  by,
  at,
});

describe("findStatusLogEntry", () => {
  it("finds the most recent matching entry for in_progress (started)", () => {
    const log: LogEntry[] = [
      makeEntry("created", "2026-01-01T00:00:00Z"),
      makeEntry("ready", "2026-01-02T00:00:00Z"),
      makeEntry("started", "2026-01-03T00:00:00Z"),
    ];
    const entry = findStatusLogEntry(log, "in_progress");
    expect(entry?.at).toBe("2026-01-03T00:00:00Z");
  });

  it("matches in_progress action verbatim too", () => {
    const log: LogEntry[] = [
      makeEntry("started", "2026-01-01T00:00:00Z"),
      makeEntry("in_progress", "2026-01-04T00:00:00Z"),
    ];
    const entry = findStatusLogEntry(log, "in_progress");
    expect(entry?.at).toBe("2026-01-04T00:00:00Z");
  });

  it("matches in_review and moved_to_review", () => {
    const a: LogEntry[] = [makeEntry("in_review", "2026-02-01T00:00:00Z")];
    expect(findStatusLogEntry(a, "in_review")?.at).toBe(
      "2026-02-01T00:00:00Z",
    );
    const b: LogEntry[] = [makeEntry("moved_to_review", "2026-02-02T00:00:00Z")];
    expect(findStatusLogEntry(b, "in_review")?.at).toBe(
      "2026-02-02T00:00:00Z",
    );
  });

  it("returns null when no entry matches", () => {
    const log: LogEntry[] = [makeEntry("created", "2026-01-01T00:00:00Z")];
    expect(findStatusLogEntry(log, "in_progress")).toBeNull();
  });

  it("returns null when log is undefined or empty", () => {
    expect(findStatusLogEntry(undefined, "ready")).toBeNull();
    expect(findStatusLogEntry([], "ready")).toBeNull();
  });

  it("matches reviewing action verbatim", () => {
    const log: LogEntry[] = [makeEntry("reviewing", "2026-03-01T00:00:00Z")];
    expect(findStatusLogEntry(log, "reviewing")?.at).toBe(
      "2026-03-01T00:00:00Z",
    );
  });

  it("handles reviewing with 'reviewing' action alias", () => {
    const log: LogEntry[] = [makeEntry("reviewing", "2026-03-02T12:00:00Z")];
    expect(findStatusLogEntry(log, "reviewing")?.at).toBe(
      "2026-03-02T12:00:00Z",
    );
  });

  it("returns null for unknown statuses (todo, done, etc.)", () => {
    const log: LogEntry[] = [makeEntry("done", "2026-01-01T00:00:00Z")];
    expect(findStatusLogEntry(log, "done")).toBeNull();
    expect(findStatusLogEntry(log, "todo")).toBeNull();
  });

  it("picks the latest occurrence when an action repeats", () => {
    const log: LogEntry[] = [
      makeEntry("started", "2026-01-01T00:00:00Z"),
      makeEntry("ready", "2026-01-02T00:00:00Z"),
      makeEntry("started", "2026-01-05T00:00:00Z"),
    ];
    expect(findStatusLogEntry(log, "in_progress")?.at).toBe(
      "2026-01-05T00:00:00Z",
    );
  });
});

describe("formatElapsed", () => {
  it("formats sub-day elapsed as Xh Ym", () => {
    expect(formatElapsed(0)).toBe("0h 0m");
    expect(formatElapsed(45 * 60 * 1000)).toBe("0h 45m");
    expect(formatElapsed(3 * 60 * 60 * 1000 + 12 * 60 * 1000)).toBe("3h 12m");
    expect(formatElapsed(23 * 60 * 60 * 1000 + 59 * 60 * 1000)).toBe(
      "23h 59m",
    );
  });

  it("formats >= 24h elapsed as Xd Yh", () => {
    const ms = 24 * 60 * 60 * 1000;
    expect(formatElapsed(ms)).toBe("1d 0h");
    expect(formatElapsed(ms + 5 * 60 * 60 * 1000)).toBe("1d 5h");
    expect(formatElapsed(3 * ms + 12 * 60 * 60 * 1000)).toBe("3d 12h");
  });

  it("returns em-dash for negative input", () => {
    expect(formatElapsed(-1)).toBe("—");
  });
});

describe("getElapsedSinceStatus", () => {
  it("computes elapsed time from the matching log entry", () => {
    const now = new Date("2026-01-01T05:30:00Z");
    const task = {
      status: "in_progress",
      log: [makeEntry("started", "2026-01-01T03:00:00Z")],
    };
    expect(getElapsedSinceStatus(task, now)).toBe("2h 30m");
  });

  it("returns em-dash when no matching entry exists", () => {
    const task = {
      status: "in_progress",
      log: [makeEntry("created", "2026-01-01T00:00:00Z")],
    };
    expect(getElapsedSinceStatus(task)).toBe("—");
  });

  it("returns em-dash when the log entry has an unparseable date", () => {
    const task = {
      status: "ready",
      log: [makeEntry("ready", "not-a-date")],
    };
    expect(getElapsedSinceStatus(task)).toBe("—");
  });

  it("returns em-dash when log is undefined", () => {
    const task = { status: "ready", log: undefined };
    expect(getElapsedSinceStatus(task)).toBe("—");
  });

  it("returns em-dash when elapsed is negative (clock skew)", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const task = {
      status: "ready",
      log: [makeEntry("ready", "2026-01-02T00:00:00Z")],
    };
    expect(getElapsedSinceStatus(task, now)).toBe("—");
  });
});

describe("formatTimestamp", () => {
  it("formats a valid ISO timestamp as MMM d HH:mm", () => {
    const formatted = formatTimestamp("2026-05-06T09:42:00Z");
    expect(formatted).toMatch(/May 6 \d{2}:\d{2}/);
  });

  it("returns the raw input when the timestamp is unparseable", () => {
    expect(formatTimestamp("garbage")).toBe("garbage");
  });
});

describe("isTodayTimestamp", () => {
  it("returns true when timestamp is on the same local day", () => {
    const now = new Date(2026, 4, 7, 15, 0);
    const timestamp = new Date(2026, 4, 7, 1, 30).toISOString();

    expect(isTodayTimestamp(timestamp, now)).toBe(true);
  });

  it("returns false when timestamp is on another local day", () => {
    const now = new Date(2026, 4, 7, 15, 0);
    const timestamp = new Date(2026, 4, 6, 23, 30).toISOString();

    expect(isTodayTimestamp(timestamp, now)).toBe(false);
  });

  it("returns false for an invalid timestamp", () => {
    expect(isTodayTimestamp("bad-date", new Date(2026, 4, 7, 15, 0))).toBe(
      false,
    );
  });
});

describe("getFeatureLastModifiedAt", () => {
  it("returns the latest valid task log timestamp in a feature", () => {
    const feature: ParsedFeature = {
      id: "auth",
      title: "Auth",
      featureStatus: "in_implementation",
      tasks: [
        {
          id: "T1",
          title: "First",
          status: "done",
          dependsOn: [],
          log: [
            makeEntry("created", "2026-05-01T00:00:00Z"),
            makeEntry("done", "2026-05-03T00:00:00Z"),
          ],
        },
        {
          id: "T2",
          title: "Second",
          status: "ready",
          dependsOn: [],
          log: [makeEntry("ready", "2026-05-05T12:30:00Z")],
        },
      ],
    };

    expect(getFeatureLastModifiedAt(feature)).toBe("2026-05-05T12:30:00Z");
  });

  it("uses execution.last_updated_at when it is newer than log entries", () => {
    const feature: ParsedFeature = {
      id: "auth",
      title: "Auth",
      featureStatus: "in_implementation",
      tasks: [
        {
          id: "T1",
          title: "First",
          status: "in_progress",
          dependsOn: [],
          execution: {
            actor_type: "agent",
            last_updated_at: "2026-05-07T08:45:00Z",
          },
          log: [makeEntry("started", "2026-05-06T01:00:00Z")],
        },
      ],
    };

    expect(getFeatureLastModifiedAt(feature)).toBe("2026-05-07T08:45:00Z");
  });

  it("returns null when no task has a valid timestamp", () => {
    const feature: ParsedFeature = {
      id: "auth",
      title: "Auth",
      featureStatus: "in_implementation",
      tasks: [
        {
          id: "T1",
          title: "First",
          status: "ready",
          dependsOn: [],
          execution: { actor_type: "agent", last_updated_at: "bad-date" },
          log: [makeEntry("ready", "bad-date")],
        },
      ],
    };

    expect(getFeatureLastModifiedAt(feature)).toBeNull();
  });
});

// ─── computeStatusAge with reviewing ──────────────────────────────────────

describe("computeStatusAge — reviewing", () => {
  it("computes age from reviewing log entry", () => {
    const now = new Date("2026-05-27T10:00:00Z");
    const task = {
      status: "reviewing",
      log: [makeEntry("reviewing", "2026-05-27T08:00:00Z")],
    };
    expect(computeStatusAge(task, now)).toBe("2h");
  });

  it("falls back to 'reviewing' action alias for reviewing", () => {
    const now = new Date("2026-05-27T10:00:00Z");
    const task = {
      status: "reviewing",
      log: [makeEntry("reviewing", "2026-05-27T09:45:00Z")],
    };
    expect(computeStatusAge(task, now)).toBe("15m");
  });

  it("falls back to last log entry for reviewing when no specific reviewing log action matches", () => {
    const now = new Date("2026-05-27T10:00:00Z");
    const task = {
      status: "reviewing",
      log: [makeEntry("created", "2026-05-27T07:00:00Z")],
    };
    expect(computeStatusAge(task, now)).toBe("3h");
  });

  it("uses execution.last_updated_at when both log and specific action are unavailable", () => {
    const now = new Date("2026-05-27T10:00:00Z");
    const task = {
      status: "reviewing",
      execution: {
        actor_type: "agent",
        last_updated_at: "2026-05-27T09:30:00Z",
      },
    };
    expect(computeStatusAge(task, now)).toBe("30m");
  });
});

// ─── T9 — formatLastUpdatedLabel ─────────────────────────────────────────────

describe("formatLastUpdatedLabel", () => {
  it("formats seconds with 'ago' suffix", () => {
    expect(formatLastUpdatedLabel(0)).toBe("0s ago");
    expect(formatLastUpdatedLabel(30_000)).toBe("30s ago");
    expect(formatLastUpdatedLabel(59_000)).toBe("59s ago");
  });

  it("formats minutes with 'ago' suffix", () => {
    expect(formatLastUpdatedLabel(60_000)).toBe("1m ago");
    expect(formatLastUpdatedLabel(90_000)).toBe("1m ago");
    expect(formatLastUpdatedLabel(59 * 60_000)).toBe("59m ago");
  });

  it("formats hours with 'ago' suffix", () => {
    expect(formatLastUpdatedLabel(60 * 60_000)).toBe("1h ago");
    expect(formatLastUpdatedLabel(5 * 60 * 60_000)).toBe("5h ago");
    expect(formatLastUpdatedLabel(23 * 60 * 60_000)).toBe("23h ago");
  });

  it("formats days with 'ago' suffix", () => {
    expect(formatLastUpdatedLabel(24 * 60 * 60_000)).toBe("1d ago");
    expect(formatLastUpdatedLabel(3 * 24 * 60 * 60_000)).toBe("3d ago");
  });

  it("returns em-dash for negative elapsed", () => {
    expect(formatLastUpdatedLabel(-1)).toBe("—");
  });
});

// ─── T9 — computeLastUpdatedLabel ────────────────────────────────────────────

describe("computeLastUpdatedLabel", () => {
  it("computes label from execution.last_updated_at", () => {
    const now = new Date("2026-05-27T10:00:00Z");
    const task = {
      execution: { actor_type: "agent", last_updated_at: "2026-05-27T08:00:00Z" },
    };
    expect(computeLastUpdatedLabel(task, now)).toBe("2h ago");
  });

  it("computes seconds label for recent update", () => {
    const now = new Date("2026-05-27T10:00:00Z");
    const task = {
      execution: { actor_type: "agent", last_updated_at: "2026-05-27T09:59:30Z" },
    };
    expect(computeLastUpdatedLabel(task, now)).toBe("30s ago");
  });

  it("returns null when execution is missing", () => {
    expect(computeLastUpdatedLabel({})).toBeNull();
  });

  it("returns null when execution has no last_updated_at", () => {
    expect(computeLastUpdatedLabel({ execution: { actor_type: "agent" } })).toBeNull();
  });

  it("returns null for invalid ISO timestamp", () => {
    const task = {
      execution: { actor_type: "agent", last_updated_at: "not-a-date" },
    };
    expect(computeLastUpdatedLabel(task)).toBeNull();
  });
});
