import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Tests for getUnreadMentions, markThreadRead, and getThreadMembers API wrappers.

vi.stubEnv("NEXT_PUBLIC_BFF_URL", "http://localhost:8090");

const { getUnreadMentions, markThreadRead, getThreadMembers } = await import("@/services/hermes-agent/chat");

describe("getUnreadMentions", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns total and perSession from the API", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        total: 3,
        perSession: { "session-1": 2, "session-2": 1 },
      }),
    } as Response);

    const result = await getUnreadMentions("ws-1");
    expect(result.total).toBe(3);
    expect(result.perSession["session-1"]).toBe(2);
  });

  it("throws on non-OK response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    await expect(getUnreadMentions("ws-1")).rejects.toThrow("getUnreadMentions failed (500)");
  });
});

describe("markThreadRead", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the /read endpoint with POST", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response);

    await markThreadRead("thread-abc");
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(expect.stringContaining("/threads/thread-abc/read"), expect.objectContaining({ method: "POST" }));
  });

  it("swallows errors gracefully (best-effort)", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));
    // Should not throw
    await expect(markThreadRead("thread-xyz")).resolves.toBeUndefined();
  });
});

describe("getThreadMembers", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prepends @agent sentinel and maps human members", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        members: [
          { id: "u1", name: "Alice", handle: "alice", avatar_url: "https://example.com/a.png", role_label: "PO" },
          { id: "u2", name: "Bob", handle: "bob", avatar_url: null, role_label: null },
        ],
      }),
    } as Response);

    const members = await getThreadMembers("thread-1");
    // Agent is always first
    expect(members[0].kind).toBe("agent");
    expect(members[0].handle).toBe("agent");
    // Then human members
    expect(members[1].id).toBe("u1");
    expect(members[1].handle).toBe("alice");
    expect(members[1].avatarUrl).toBe("https://example.com/a.png");
    expect(members[1].roleLabel).toBe("PO");
    expect(members[2].id).toBe("u2");
    expect(members.length).toBe(3);
  });

  it("falls back to lowercase display name when handle is missing", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        members: [{ id: "u1", name: "John Doe" }],
      }),
    } as Response);

    const members = await getThreadMembers("thread-1");
    const human = members.find((m) => m.id === "u1");
    expect(human?.handle).toBe("johndoe");
  });

  it("returns only agent sentinel when members array is empty", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ members: [] }),
    } as Response);

    const members = await getThreadMembers("thread-empty");
    expect(members).toHaveLength(1);
    expect(members[0].kind).toBe("agent");
  });

  it("throws on non-OK response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
    } as Response);

    await expect(getThreadMembers("t1")).rejects.toThrow("getThreadMembers failed (403)");
  });
});
