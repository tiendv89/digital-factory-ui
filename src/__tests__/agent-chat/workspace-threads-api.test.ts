import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("NEXT_PUBLIC_BFF_URL", "http://localhost:8090");

const { listWorkspaceThreads, createWorkspaceThread } = await import("@/services/hermes-agent/chat");

const BASE = "http://localhost:8090/bff/hermes-agent";

describe("listWorkspaceThreads", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches workspace threads for a workspace", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        threads: [
          { id: "t-1", title: "API discussion", workspace_id: "ws-1", created_at: 1000, member_count: 3 },
          { id: "t-2", title: null, workspace_id: "ws-1", created_at: 2000 },
        ],
      }),
    } as Response);

    const result = await listWorkspaceThreads("ws-1");

    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/v1/threads?workspace_id=ws-1`, { credentials: "include" });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "t-1", title: "API discussion", member_count: 3 });
    expect(result[1]).toMatchObject({ id: "t-2", title: null });
  });

  it("returns empty array when threads key is absent", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response);

    const result = await listWorkspaceThreads("ws-1");
    expect(result).toEqual([]);
  });

  it("throws on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401 } as Response);
    await expect(listWorkspaceThreads("ws-1")).rejects.toThrow("listWorkspaceThreads failed (401)");
  });
});

describe("createWorkspaceThread", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs to /api/v1/threads and returns the thread", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        thread: { id: "t-new", title: "Design sync", workspace_id: "ws-1", created_at: 9999 },
      }),
    } as Response);

    const result = await createWorkspaceThread("ws-1", "Design sync");

    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/v1/threads`, expect.objectContaining({ method: "POST", credentials: "include" }));
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({ workspace_id: "ws-1", title: "Design sync" });
    expect(result).toMatchObject({ id: "t-new", title: "Design sync" });
  });

  it("omits title when not provided", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ thread: { id: "t-notitle", title: null, workspace_id: "ws-1", created_at: 1 } }),
    } as Response);

    await createWorkspaceThread("ws-1");

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).not.toHaveProperty("title");
    expect(body.workspace_id).toBe("ws-1");
  });

  it("includes members when provided", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ thread: { id: "t-m", title: "Squad", workspace_id: "ws-1", created_at: 1 } }),
    } as Response);

    await createWorkspaceThread("ws-1", "Squad", ["u-1", "u-2"]);

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({ workspace_id: "ws-1", title: "Squad", members: ["u-1", "u-2"] });
  });

  it("omits members when array is empty", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ thread: { id: "t-nomem", title: "Solo", workspace_id: "ws-1", created_at: 1 } }),
    } as Response);

    await createWorkspaceThread("ws-1", "Solo", []);

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).not.toHaveProperty("members");
  });

  it("throws on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 403, text: async () => "Forbidden" } as Response);
    await expect(createWorkspaceThread("ws-1", "Test")).rejects.toThrow("createWorkspaceThread failed (403)");
  });
});
