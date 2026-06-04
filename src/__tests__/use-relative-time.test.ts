// @vitest-environment jsdom
/**
 * Unit tests for useRelativeTime hook
 *
 * Verifies:
 *   - Correct format strings for 0s, 30s, 5m, 2h, 3d inputs
 *   - Returns empty string for null/undefined/missing timestamp
 *   - Handles future dates (negative diff) gracefully → "just now"
 *   - Handles invalid/unparseable timestamps → empty string
 *   - Updates on window focus event
 *   - Updates on 1s interval
 */

import { renderHook, act, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRelativeTime } from "../hooks/useRelativeTime";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ─── Format boundaries ────────────────────────────────────────────────────────

describe("useRelativeTime — format boundaries", () => {
  it("returns '0s ago' for a timestamp equal to now", () => {
    const iso = new Date(Date.now()).toISOString();
    const { result } = renderHook(() => useRelativeTime(iso));
    expect(result.current).toBe("0s ago");
  });

  it("returns 'Xs ago' for sub-minute elapsed", () => {
    const iso = new Date(Date.now() - 30_000).toISOString();
    const { result } = renderHook(() => useRelativeTime(iso));
    expect(result.current).toBe("30s ago");
  });

  it("returns '59s ago' at 59 seconds", () => {
    const iso = new Date(Date.now() - 59_000).toISOString();
    const { result } = renderHook(() => useRelativeTime(iso));
    expect(result.current).toBe("59s ago");
  });

  it("returns 'Xm SSs ago' for sub-hour elapsed", () => {
    const iso = new Date(Date.now() - 5 * 60_000).toISOString();
    const { result } = renderHook(() => useRelativeTime(iso));
    expect(result.current).toBe("5m 00s ago");
  });

  it("returns '1m 00s ago' at exactly 60 seconds", () => {
    const iso = new Date(Date.now() - 60_000).toISOString();
    const { result } = renderHook(() => useRelativeTime(iso));
    expect(result.current).toBe("1m 00s ago");
  });

  it("returns 'Xh MMm SSs ago' for sub-day elapsed", () => {
    const iso = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
    const { result } = renderHook(() => useRelativeTime(iso));
    expect(result.current).toBe("2h 00m 00s ago");
  });

  it("returns '1h 00m 00s ago' at exactly 60 minutes", () => {
    const iso = new Date(Date.now() - 60 * 60_000).toISOString();
    const { result } = renderHook(() => useRelativeTime(iso));
    expect(result.current).toBe("1h 00m 00s ago");
  });

  it("returns 'Xd HHh MMm SSs ago' for >= 24 hours elapsed", () => {
    const iso = new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString();
    const { result } = renderHook(() => useRelativeTime(iso));
    expect(result.current).toBe("3d 00h 00m 00s ago");
  });

  it("returns '1d 00h 00m 00s ago' at exactly 24 hours", () => {
    const iso = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    const { result } = renderHook(() => useRelativeTime(iso));
    expect(result.current).toBe("1d 00h 00m 00s ago");
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("useRelativeTime — edge cases", () => {
  it("returns empty string for null", () => {
    const { result } = renderHook(() => useRelativeTime(null));
    expect(result.current).toBe("");
  });

  it("returns empty string for undefined", () => {
    const { result } = renderHook(() => useRelativeTime(undefined));
    expect(result.current).toBe("");
  });

  it("returns empty string for invalid timestamp", () => {
    const { result } = renderHook(() => useRelativeTime("not-a-date"));
    expect(result.current).toBe("");
  });

  it("returns 'just now' for future timestamps (negative diff)", () => {
    const futureIso = new Date(Date.now() + 60_000).toISOString();
    const { result } = renderHook(() => useRelativeTime(futureIso));
    expect(result.current).toBe("just now");
  });
});

// ─── Window focus recalculation ───────────────────────────────────────────────

describe("useRelativeTime — recalculates on window focus", () => {
  it("updates display when window gains focus", () => {
    vi.useFakeTimers();
    const base = Date.now();

    // Start at 30s ago
    vi.setSystemTime(base);
    const iso = new Date(base - 30_000).toISOString();
    const { result } = renderHook(() => useRelativeTime(iso));
    expect(result.current).toBe("30s ago");

    // Advance time by 90 seconds, then fire focus event
    vi.setSystemTime(base + 90_000);
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(result.current).toBe("2m 00s ago");
  });
});

// ─── Interval-based refresh ──────────────────────────────────────────────────

describe("useRelativeTime — updates every second", () => {
  it("refreshes display after 1s interval", () => {
    vi.useFakeTimers();
    const base = Date.now();

    vi.setSystemTime(base);
    const iso = new Date(base - 30_000).toISOString();
    const { result } = renderHook(() => useRelativeTime(iso));
    expect(result.current).toBe("30s ago");

    // Advance 1 second — interval fires
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(result.current).toBe("31s ago");
  });
});
