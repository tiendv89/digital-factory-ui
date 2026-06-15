import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("NEXT_PUBLIC_BFF_URL", "http://localhost:8090");

const { listChannels, createChannel, deleteChannel, joinChannel } = await import("@/services/hermes-agent/chat");

const BASE = "http://localhost:8090/bff/hermes-agent";

describe("listChannels", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches channels for a workspace", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        channels: [
          { id: "ch-1", name: "general", feature_id: "feat-1" },
          { id: "ch-2", name: "random", feature_id: "feat-1", description: "misc" },
        ],
      }),
    } as Response);

    const result = await listChannels("ws-1");

    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/v1/channels?workspace_id=ws-1`, { credentials: "include" });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "ch-1", name: "general" });
    expect(result[1]).toMatchObject({ id: "ch-2", name: "random", description: "misc" });
  });

  it("scopes to a feature when featureId is given", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ channels: [] }) } as Response);

    await listChannels("ws-1", "feat-1");

    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/v1/channels?workspace_id=ws-1&feature_id=feat-1`, { credentials: "include" });
  });

  it("returns empty array when channels key is absent", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response);

    const result = await listChannels("ws-1");
    expect(result).toEqual([]);
  });

  it("throws on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401 } as Response);
    await expect(listChannels("ws-1")).rejects.toThrow("listChannels failed (401)");
  });
});

describe("createChannel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs a feature-scoped channel and returns the new channel id", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ channel_id: "ch-new" }),
    } as Response);

    const result = await createChannel("ws-1", "feat-1", "dev");

    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/v1/channels`, expect.objectContaining({ method: "POST", credentials: "include" }));
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({ workspace_id: "ws-1", feature_id: "feat-1", name: "dev" });
    expect(result).toBe("ch-new");
  });

  it("includes description when provided", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ channel_id: "ch-x" }),
    } as Response);

    await createChannel("ws-1", "feat-1", "qa", "QA channel");

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({ description: "QA channel" });
  });

  it("throws on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 409,
      text: async () => "name taken",
    } as Response);

    await expect(createChannel("ws-1", "feat-1", "dup")).rejects.toThrow("createChannel failed (409)");
  });
});

describe("deleteChannel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends DELETE to the channel endpoint", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);

    await deleteChannel("ch-1");

    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/v1/channels/ch-1`, expect.objectContaining({ method: "DELETE", credentials: "include" }));
  });

  it("URL-encodes the channel ID", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);
    await deleteChannel("ch/with/slashes");
    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledUrl).toBe(`${BASE}/api/v1/channels/ch%2Fwith%2Fslashes`);
  });

  it("throws on 403 (non-admin)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => "forbidden",
    } as Response);

    await expect(deleteChannel("ch-1")).rejects.toThrow("deleteChannel failed (403)");
  });
});

describe("joinChannel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs to the join endpoint", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);

    await joinChannel("ch-1");

    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/v1/channels/ch-1/join`, expect.objectContaining({ method: "POST", credentials: "include" }));
  });

  it("throws on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => "not found",
    } as Response);

    await expect(joinChannel("ch-99")).rejects.toThrow("joinChannel failed (404)");
  });
});
