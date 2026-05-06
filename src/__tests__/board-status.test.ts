import { describe, it, expect } from "vitest";
import {
  STATUS_KEYS,
  STATUS_LABEL,
  STATUS_NEXT_ACTION,
  STATUS_TONE,
  normalizeStatus,
} from "@/features/board/lib/status";

describe("status constants", () => {
  it("declares exactly seven status columns in fixed order", () => {
    expect(STATUS_KEYS).toEqual([
      "todo",
      "ready",
      "in_progress",
      "blocked",
      "in_review",
      "done",
      "cancelled",
    ]);
  });

  it("provides a label for every status key", () => {
    for (const key of STATUS_KEYS) {
      expect(STATUS_LABEL[key]).toBeTruthy();
    }
  });

  it("provides a next-action label for every status key", () => {
    for (const key of STATUS_KEYS) {
      expect(STATUS_NEXT_ACTION[key]).toBeTruthy();
    }
  });

  it("provides tone tokens for every status key", () => {
    for (const key of STATUS_KEYS) {
      const tone = STATUS_TONE[key];
      expect(tone.dot).toBeTruthy();
      expect(tone.badgeBg).toBeTruthy();
      expect(tone.badgeText).toBeTruthy();
      expect(tone.cardBorder).toBeTruthy();
      expect(tone.segment).toBeTruthy();
    }
  });
});

describe("normalizeStatus", () => {
  it.each(STATUS_KEYS)("passes through known status %s", (status) => {
    expect(normalizeStatus(status)).toBe(status);
  });

  it("falls back to todo for unknown statuses", () => {
    expect(normalizeStatus("garbage")).toBe("todo");
    expect(normalizeStatus("")).toBe("todo");
    expect(normalizeStatus(null)).toBe("todo");
    expect(normalizeStatus(undefined)).toBe("todo");
  });
});
