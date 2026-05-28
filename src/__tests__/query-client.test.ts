import { describe, it, expect } from "vitest";

// Stub browser APIs before module load
// @ts-expect-error global stub
global.window = { addEventListener: () => {}, removeEventListener: () => {} };
// @ts-expect-error global stub
global.document = { addEventListener: () => {}, removeEventListener: () => {}, visibilityState: "visible" };

import { createQueryClient } from "../lib/query-client";

const FIVE_MINUTES = 5 * 60 * 1000;

describe("createQueryClient", () => {
  it("creates a QueryClient with 5-minute stale time", () => {
    const client = createQueryClient();
    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(FIVE_MINUTES);
  });

  it("disables refetch on window focus", () => {
    const client = createQueryClient();
    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
  });

  it("creates independent clients on each call", () => {
    const a = createQueryClient();
    const b = createQueryClient();
    expect(a).not.toBe(b);
  });
});
