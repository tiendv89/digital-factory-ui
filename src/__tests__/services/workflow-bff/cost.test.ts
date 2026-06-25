import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionCost } from "@/services/workflow-bff/cost";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

afterEach(() => {
  vi.clearAllMocks();
});

beforeEach(() => {
  // Reset to default BFF URL
  process.env.NEXT_PUBLIC_BFF_URL = "http://localhost:8090";
});

const sampleCostResponse = {
  session_credits: 25,
  turn_count: 3,
  quota: {
    daily_used: 1000,
    daily_cap: 10000,
    weekly_used: 5000,
    weekly_cap: 50000,
    plan_name: "Pro",
    daily_reset_at: "2026-06-25T00:00:00Z",
    weekly_reset_at: "2026-06-30T00:00:00Z",
  },
  turns: [
    {
      turn_id: "turn-1",
      credits_used: 10,
      model_id: "claude-sonnet-4-6",
      tokens: { input: 100, output: 200, cache_read: 0, cache_write: 0 },
      stopped: false,
    },
    {
      turn_id: "turn-2",
      credits_used: 8,
      model_id: "claude-sonnet-4-6",
      tokens: { input: 80, output: 160, cache_read: 0, cache_write: 0 },
      stopped: false,
    },
    {
      turn_id: "turn-3",
      credits_used: 7,
      model_id: "claude-sonnet-4-6",
      tokens: { input: 70, output: 70, cache_read: 0, cache_write: 0 },
      stopped: true,
    },
  ],
};

describe("getSessionCost", () => {
  it("calls the correct endpoint with the session id", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sampleCostResponse,
    });

    await getSessionCost("session-abc");

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/sessions/session-abc/cost"), expect.objectContaining({ credentials: "include" }));
  });

  it("returns the session cost response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sampleCostResponse,
    });

    const result = await getSessionCost("session-abc");

    expect(result.session_credits).toBe(25);
    expect(result.turn_count).toBe(3);
    expect(result.quota.plan_name).toBe("Pro");
    expect(result.quota.daily_cap).toBe(10000);
    expect(result.turns).toHaveLength(3);
  });

  it("returns credits_used for each turn — no USD field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sampleCostResponse,
    });

    const result = await getSessionCost("session-abc");

    for (const turn of result.turns) {
      expect(turn.credits_used).toBeTypeOf("number");
      // No USD field should be surfaced to the UI
      expect("cost_usd" in turn).toBe(false);
    }
  });

  it("marks stopped turns correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sampleCostResponse,
    });

    const result = await getSessionCost("session-abc");

    const stopped = result.turns.find((t) => t.stopped);
    expect(stopped).toBeDefined();
    expect(stopped?.turn_id).toBe("turn-3");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    await expect(getSessionCost("session-bad")).rejects.toThrow("getSessionCost failed (503)");
  });

  it("URL-encodes the session id", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sampleCostResponse,
    });

    await getSessionCost("session/with/slashes");

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("session%2Fwith%2Fslashes"), expect.any(Object));
  });
});
