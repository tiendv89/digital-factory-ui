import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Stub environment variable before importing module
vi.stubEnv("NEXT_PUBLIC_BFF_URL", "http://localhost:8090");

const { listTools, stageTransition } = await import("@/services/hermes-agent/tools");

describe("listTools", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns tools array from successful response", async () => {
    const mockTools = [
      { name: "workflow_write_product_spec", description: "Draft or update the product spec" },
      { name: "workflow_request_approval", description: "Request stage approval from a human" },
    ];
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tools: mockTools }),
    } as Response);

    const result = await listTools();
    expect(result).toEqual(mockTools);
    expect(fetch).toHaveBeenCalledWith("http://localhost:8090/bff/hermes-agent/api/v1/tools", {
      credentials: "include",
    });
  });

  it("returns empty array when tools key is absent", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response);

    const result = await listTools();
    expect(result).toEqual([]);
  });

  it("throws on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
    } as Response);

    await expect(listTools()).rejects.toThrow("listTools failed (503)");
  });
});

describe("stageTransition", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the correct endpoint with approve action", async () => {
    const mockResponse = { ok: true, feature_id: "my-feature", stage: "product_spec", action: "approve" };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await stageTransition("my-feature", { stage: "product_spec", action: "approve" });
    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8090/bff/hermes-agent/api/v1/features/my-feature/stage-transition",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "product_spec", action: "approve" }),
      }),
    );
  });

  it("includes optional comment in reject body", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, feature_id: "f1", stage: "technical_design", action: "reject" }),
    } as Response);

    await stageTransition("f1", { stage: "technical_design", action: "reject", comment: "Needs more detail" });
    const callArg = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    const body = JSON.parse(callArg.body as string) as Record<string, unknown>;
    expect(body.comment).toBe("Needs more detail");
  });

  it("throws on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 409,
      text: async () => "conflict",
    } as Response);

    await expect(stageTransition("f1", { stage: "product_spec", action: "approve" })).rejects.toThrow("stageTransition failed (409)");
  });
});
