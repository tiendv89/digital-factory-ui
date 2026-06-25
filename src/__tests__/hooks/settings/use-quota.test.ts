// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { computeBarState, formatDailyCountdown, formatRelativeTimestamp, formatWeeklyCountdown, useUsage } from "@/hooks/settings/use-quota";
import type { OrgUsage } from "@/services/user-service/usage";

vi.mock("@/services/user-service/usage", () => ({
  getUsage: vi.fn(),
}));

const MOCK_USAGE: OrgUsage[] = [
  {
    org_id: "org-1",
    org_slug: "acme",
    org_name: "Acme",
    role: "admin",
    plan_name: "pro",
    plan_display_name: "Pro",
    daily_used: 100,
    daily_cap: 1000,
    weekly_used: 200,
    weekly_cap: 5000,
    daily_reset_at: "2026-06-25T00:00:00Z",
    weekly_reset_at: "2026-06-29T00:00:00Z",
  },
];

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
}

// ── computeBarState ──────────────────────────────────────────────────────────

describe("computeBarState — color thresholds", () => {
  const RESET = "2026-06-25T00:00:00Z";

  it("returns neutral color when pct < 80", () => {
    const s = computeBarState(500, 1000, RESET);
    expect(s.pct).toBe(50);
    expect(s.color).toBe("neutral");
  });

  it("returns neutral color at exactly 79%", () => {
    const s = computeBarState(79, 100, RESET);
    expect(s.color).toBe("neutral");
  });

  it("returns warning color at exactly 80%", () => {
    const s = computeBarState(80, 100, RESET);
    expect(s.pct).toBe(80);
    expect(s.color).toBe("warning");
  });

  it("returns warning color between 80% and 99%", () => {
    const s = computeBarState(90, 100, RESET);
    expect(s.color).toBe("warning");
  });

  it("returns warning color at 99%", () => {
    const s = computeBarState(99, 100, RESET);
    expect(s.color).toBe("warning");
  });

  it("returns danger color at exactly 100%", () => {
    const s = computeBarState(100, 100, RESET);
    expect(s.pct).toBe(100);
    expect(s.color).toBe("danger");
  });

  it("caps pct at 100 when used > cap", () => {
    const s = computeBarState(150, 100, RESET);
    expect(s.pct).toBe(100);
    expect(s.color).toBe("danger");
  });

  it("returns neutral with pct 0 when cap is 0", () => {
    const s = computeBarState(0, 0, RESET);
    expect(s.pct).toBe(0);
    expect(s.color).toBe("neutral");
  });

  it("exposes used and cap values", () => {
    const s = computeBarState(300, 1000, RESET);
    expect(s.used).toBe(300);
    expect(s.cap).toBe(1000);
  });

  it("parses resetAt into a Date", () => {
    const s = computeBarState(50, 100, "2026-06-25T00:00:00Z");
    expect(s.resetAt).toBeInstanceOf(Date);
    expect(s.resetAt.getFullYear()).toBe(2026);
  });
});

// ── formatDailyCountdown ─────────────────────────────────────────────────────

describe("formatDailyCountdown", () => {
  it("shows hours and minutes for a future reset", () => {
    const resetAt = new Date("2026-06-25T12:30:00Z");
    const now = new Date("2026-06-25T09:00:00Z"); // 3h30m before
    expect(formatDailyCountdown(resetAt, now)).toBe("Resets in 3h 30m");
  });

  it("shows 0 minutes when exactly on the hour", () => {
    const resetAt = new Date("2026-06-25T12:00:00Z");
    const now = new Date("2026-06-25T10:00:00Z"); // exactly 2h
    expect(formatDailyCountdown(resetAt, now)).toBe("Resets in 2h 0m");
  });

  it("shows 0h for remaining time less than an hour", () => {
    const resetAt = new Date("2026-06-25T09:45:00Z");
    const now = new Date("2026-06-25T09:30:00Z");
    expect(formatDailyCountdown(resetAt, now)).toBe("Resets in 0h 15m");
  });

  it("returns 'Resets soon' when reset is in the past", () => {
    const resetAt = new Date("2026-06-25T09:00:00Z");
    const now = new Date("2026-06-25T10:00:00Z");
    expect(formatDailyCountdown(resetAt, now)).toBe("Resets soon");
  });

  it("returns 'Resets soon' when reset equals now", () => {
    const t = new Date("2026-06-25T12:00:00Z");
    expect(formatDailyCountdown(t, t)).toBe("Resets soon");
  });
});

// ── formatWeeklyCountdown ────────────────────────────────────────────────────

describe("formatWeeklyCountdown", () => {
  it("shows the calendar day name and local time (AM)", () => {
    // A known Monday at 05:00 local (UTC)
    const resetAt = new Date("2026-06-29T05:00:00Z");
    const result = formatWeeklyCountdown(resetAt);
    // Day name should be present
    expect(result).toMatch(/^Resets (Sun|Mon|Tue|Wed|Thu|Fri|Sat) \d{1,2}:\d{2} (AM|PM)$/);
  });

  it("formats PM times correctly", () => {
    // A date with hour 17 (5 PM UTC)
    const resetAt = new Date("2026-06-29T17:00:00Z");
    const result = formatWeeklyCountdown(resetAt);
    expect(result).toMatch(/(AM|PM)/);
  });

  it("pads minutes to two digits", () => {
    const resetAt = new Date("2026-06-29T17:05:00Z");
    const result = formatWeeklyCountdown(resetAt);
    expect(result).toMatch(/:\d{2} /);
  });
});

// ── formatRelativeTimestamp ──────────────────────────────────────────────────

describe("formatRelativeTimestamp", () => {
  it("returns 'just now' within 4 seconds", () => {
    const fetchedAt = new Date("2026-06-25T10:00:00Z");
    const now = new Date("2026-06-25T10:00:03Z");
    expect(formatRelativeTimestamp(fetchedAt, now)).toBe("just now");
  });

  it("returns seconds ago between 5s and 59s", () => {
    const fetchedAt = new Date("2026-06-25T10:00:00Z");
    const now = new Date("2026-06-25T10:00:30Z");
    expect(formatRelativeTimestamp(fetchedAt, now)).toBe("30s ago");
  });

  it("returns minutes ago for 1–59 minutes", () => {
    const fetchedAt = new Date("2026-06-25T10:00:00Z");
    const now = new Date("2026-06-25T10:05:00Z");
    expect(formatRelativeTimestamp(fetchedAt, now)).toBe("5m ago");
  });

  it("returns hours ago for >= 60 minutes", () => {
    const fetchedAt = new Date("2026-06-25T09:00:00Z");
    const now = new Date("2026-06-25T11:00:00Z");
    expect(formatRelativeTimestamp(fetchedAt, now)).toBe("2h ago");
  });
});

// ── useUsage — refresh ───────────────────────────────────────────────────────

describe("useUsage — refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("re-fetches usage when refresh() is called", async () => {
    const { getUsage } = await import("@/services/user-service/usage");
    const mockFetch = vi.mocked(getUsage);
    mockFetch.mockResolvedValue(MOCK_USAGE);

    const { result } = renderHook(() => useUsage(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.sections[0]?.plan_display_name).toBe("Pro");

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });
});
