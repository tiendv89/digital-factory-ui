import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("NEXT_PUBLIC_BFF_URL", "http://localhost:8090");

const { listChannels, createChannel, deleteChannel, joinChannel, listThreadMembers, addThreadMember, removeThreadMember } = await import("@/services/hermes-agent/chat");

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
          { id: "ch-1", name: "general", workspace_id: "ws-1", created_at: 1000 },
          { id: "ch-2", name: "random", workspace_id: "ws-1", created_at: 2000, description: "misc" },
        ],
      }),
    } as Response);

    const result = await listChannels("ws-1");

    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/v1/channels?workspace_id=ws-1`, { credentials: "include" });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "ch-1", name: "general" });
    expect(result[1]).toMatchObject({ id: "ch-2", name: "random", description: "misc" });
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

  it("POSTs to /api/v1/channels and returns the channel", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        channel: { id: "ch-new", name: "dev", workspace_id: "ws-1", created_at: 9999 },
      }),
    } as Response);

    const result = await createChannel("ws-1", "dev");

    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/v1/channels`, expect.objectContaining({ method: "POST", credentials: "include" }));
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({ workspace_id: "ws-1", name: "dev" });
    expect(result).toMatchObject({ id: "ch-new", name: "dev" });
  });

  it("includes description when provided", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ channel: { id: "ch-x", name: "qa", workspace_id: "ws-1", created_at: 1, description: "QA channel" } }),
    } as Response);

    await createChannel("ws-1", "qa", "QA channel");

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({ description: "QA channel" });
  });

  it("throws on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 409,
      text: async () => "name taken",
    } as Response);

    await expect(createChannel("ws-1", "dup")).rejects.toThrow("createChannel failed (409)");
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

describe("listThreadMembers", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches members for a thread", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        members: [
          { user_id: "u1", display_name: "Alice", role_label: "admin" },
          { user_id: "u2", display_name: "Bob", role_label: null },
        ],
      }),
    } as Response);

    const result = await listThreadMembers("t-1");

    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/v1/threads/t-1/members`, { credentials: "include" });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ user_id: "u1", display_name: "Alice" });
  });

  it("returns empty array when members key is absent", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);
    const result = await listThreadMembers("t-1");
    expect(result).toEqual([]);
  });

  it("throws on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 404 } as Response);
    await expect(listThreadMembers("t-1")).rejects.toThrow("listThreadMembers failed (404)");
  });
});

describe("addThreadMember", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs user_id to the thread members endpoint", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);

    await addThreadMember("t-1", "u-99");

    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/v1/threads/t-1/members`, expect.objectContaining({ method: "POST", credentials: "include" }));
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ user_id: "u-99" });
  });

  it("throws on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "bad request",
    } as Response);

    await expect(addThreadMember("t-1", "u-bad")).rejects.toThrow("addThreadMember failed (400)");
  });
});

describe("removeThreadMember", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends DELETE to the thread member endpoint", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);

    await removeThreadMember("t-1", "u-1");

    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/v1/threads/t-1/members/u-1`, expect.objectContaining({ method: "DELETE", credentials: "include" }));
  });

  it("URL-encodes both thread and user IDs", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);

    await removeThreadMember("t/a", "u/b");

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledUrl).toBe(`${BASE}/api/v1/threads/t%2Fa/members/u%2Fb`);
  });

  it("throws on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => "not found",
    } as Response);

    await expect(removeThreadMember("t-1", "u-x")).rejects.toThrow("removeThreadMember failed (404)");
  });
});
