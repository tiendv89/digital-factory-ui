import { describe, it, expect } from "vitest";
import { formatTimestamp, formatElapsed } from "../lib/time";

describe("formatTimestamp", () => {
  it("formats a same-year date as 'MMM d, HH:mm'", () => {
    const now = new Date(2026, 4, 15, 10, 0, 0);
    const out = formatTimestamp("2026-05-03T18:13:00", now);
    expect(out).toBe("May 3, 18:13");
  });

  it("includes the year when the date is in a different year", () => {
    const now = new Date(2026, 4, 15, 10, 0, 0);
    const out = formatTimestamp("2025-12-31T23:05:00", now);
    expect(out).toBe("Dec 31, 2025 23:05");
  });

  it("zero-pads the time component", () => {
    const now = new Date(2026, 4, 15, 10, 0, 0);
    const out = formatTimestamp("2026-01-09T03:04:00", now);
    expect(out).toBe("Jan 9, 03:04");
  });

  it("returns the input string for an unparseable timestamp", () => {
    const out = formatTimestamp("not-a-date");
    expect(out).toBe("not-a-date");
  });
});

describe("formatElapsed", () => {
  it("returns 'just now' for < 1 minute", () => {
    const now = new Date("2026-05-15T10:00:30Z");
    expect(formatElapsed("2026-05-15T10:00:00Z", now)).toBe("just now");
  });

  it("returns minutes for under an hour", () => {
    const now = new Date("2026-05-15T10:45:00Z");
    expect(formatElapsed("2026-05-15T10:00:00Z", now)).toBe("45m");
  });

  it("returns hours and minutes for under a day", () => {
    const now = new Date("2026-05-15T13:30:00Z");
    expect(formatElapsed("2026-05-15T10:00:00Z", now)).toBe("3h 30m");
  });

  it("collapses to bare hours when minutes are zero", () => {
    const now = new Date("2026-05-15T13:00:00Z");
    expect(formatElapsed("2026-05-15T10:00:00Z", now)).toBe("3h");
  });

  it("returns days and hours for over a day", () => {
    const now = new Date("2026-05-17T15:00:00Z");
    expect(formatElapsed("2026-05-15T10:00:00Z", now)).toBe("2d 5h");
  });

  it("collapses to bare days when hours are zero", () => {
    const now = new Date("2026-05-17T10:00:00Z");
    expect(formatElapsed("2026-05-15T10:00:00Z", now)).toBe("2d");
  });

  it("returns '—' for an unparseable timestamp", () => {
    expect(formatElapsed("not-a-date")).toBe("—");
  });
});
