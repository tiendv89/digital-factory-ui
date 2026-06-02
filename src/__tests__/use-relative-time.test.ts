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
 *   - Updates on 30s interval
 */

import {
  renderHook,
  act,
  cleanup,
} from "@testing-library/react";
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
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

  it("returns 'Xm ago' for sub-hour elapsed", () => {
    const iso = new Date(Date.now() - 5 * 60_000).toISOString();
    const { result } = renderHook(() => useRelativeTime(iso));
    expect(result.current).toBe("5m ago");
  });

  it("returns '1m ago' at exactly 60 seconds", () => {
    const iso = new Date(Date.now() - 60_000).toISOString();
    const { result } = renderHook(() => useRelativeTime(iso));
    expect(result.current).toBe("1m ago");
  });

  it("returns 'Xh ago' for sub-day elapsed", () => {
    const iso = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
    const { result } = renderHook(() => useRelativeTime(iso));
    expect(result.current).toBe("2h ago");
  });

  it("returns '1h ago' at exactly 60 minutes", () => {
    const iso = new Date(Date.now() - 60 * 60_000).toISOString();
    const { result } = renderHook(() => useRelativeTime(iso));
    expect(result.current).toBe("1h ago");
  });

  it("returns 'Xd ago' for >= 24 hours elapsed", () => {
    const iso = new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString();
    const { result } = renderHook(() => useRelativeTime(iso));
    expect(result.current).toBe("3d ago");
  });

  it("returns '1d ago' at exactly 24 hours", () => {
    const iso = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    const { result } = renderHook(() => useRelativeTime(iso));
    expect(result.current).toBe("1d ago");
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

    expect(result.current).toBe("2m ago");
  });
});

// ─── Interval-based refresh ──────────────────────────────────────────────────

describe("useRelativeTime — updates every 30 seconds", () => {
  it("refreshes display after 30s interval", () => {
    vi.useFakeTimers();
    const base = Date.now();

    vi.setSystemTime(base);
    const iso = new Date(base - 30_000).toISOString();
    const { result } = renderHook(() => useRelativeTime(iso));
    expect(result.current).toBe("30s ago");

    // Advance 30 seconds — interval fires
    act(() => {
      vi.setSystemTime(base + 90_000);
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current).toBe("2m ago");
  });
});
