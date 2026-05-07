import { describe, it, expect } from "vitest";
import {
  formatStatusLabel,
  getStatusStyle,
  getNextActionLabel,
} from "../features/tasks/lib/status";

describe("formatStatusLabel", () => {
  it("replaces underscores with spaces", () => {
    expect(formatStatusLabel("in_progress")).toBe("in progress");
    expect(formatStatusLabel("in_review")).toBe("in review");
  });

  it("returns single-word statuses unchanged", () => {
    expect(formatStatusLabel("done")).toBe("done");
    expect(formatStatusLabel("blocked")).toBe("blocked");
  });
});

describe("getStatusStyle", () => {
  it("returns a style for every known lifecycle status", () => {
    const knownStatuses = [
      "todo",
      "ready",
      "in_progress",
      "blocked",
      "in_review",
      "done",
      "cancelled",
    ];

    for (const status of knownStatuses) {
      const style = getStatusStyle(status);
      expect(style.bg).toMatch(/^bg-/);
      expect(style.text).toMatch(/^text-/);
      expect(style.dot).toMatch(/^bg-/);
    }
  });

  it("uses a distinct style for blocked vs done", () => {
    const blocked = getStatusStyle("blocked");
    const done = getStatusStyle("done");
    expect(blocked.text).not.toBe(done.text);
    expect(blocked.dot).not.toBe(done.dot);
  });

  it("falls back to a neutral style for unknown statuses", () => {
    const fallback = getStatusStyle("totally-unknown-status");
    expect(fallback.bg).toBe("bg-muted-bg");
    expect(fallback.text).toBe("text-text-secondary");
    expect(fallback.dot).toBe("bg-text-muted");
  });
});

describe("getNextActionLabel", () => {
  it("returns an action for every tracked status", () => {
    const statuses = ["todo", "ready", "in_progress", "blocked", "in_review", "done", "cancelled"];
    for (const status of statuses) {
      expect(getNextActionLabel(status)).toBeDefined();
      expect(typeof getNextActionLabel(status)).toBe("string");
    }
  });

  it("returns undefined for an unknown status", () => {
    expect(getNextActionLabel("totally-unknown")).toBeUndefined();
  });
});
