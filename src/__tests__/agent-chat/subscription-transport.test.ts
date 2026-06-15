import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("NEXT_PUBLIC_BFF_URL", "http://localhost:8090");

const { getThreadMessages, sendThreadMessage } = await import("@/services/hermes-agent/chat");

const BASE = "http://localhost:8090/bff/hermes-agent";

describe("getThreadMessages", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches messages from the thread endpoint", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messages: [
          { id: "m1", role: "user", content: "hello" },
          { id: "m2", role: "assistant", content: "world" },
        ],
      }),
    } as Response);

    const result = await getThreadMessages("thread-123");

    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/v1/threads/thread-123/messages`, {
      credentials: "include",
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "m1", role: "user", content: "hello" });
    expect(result[1]).toMatchObject({ id: "m2", role: "assistant", content: "world" });
  });

  it("appends ?since= query param when provided", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    } as Response);

    await getThreadMessages("thread-abc", "msg-99");

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain("?since=msg-99");
  });

  it("populates author field when present in response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messages: [
          {
            id: "m1",
            role: "user",
            content: "hi",
            author: { id: "u1", name: "Alice", avatarUrl: "https://example.com/a.png", roleLabel: "PO" },
          },
        ],
      }),
    } as Response);

    const result = await getThreadMessages("t1");

    expect(result[0].author).toEqual({
      id: "u1",
      name: "Alice",
      avatarUrl: "https://example.com/a.png",
      roleLabel: "PO",
    });
  });

  it("leaves author undefined when not present in response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [{ id: "m1", role: "user", content: "hi" }] }),
    } as Response);

    const result = await getThreadMessages("t1");

    expect(result[0].author).toBeUndefined();
  });

  it("filters out tool and system messages", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messages: [
          { id: "m1", role: "user", content: "hello" },
          { id: "m2", role: "tool", content: "{}" },
          { id: "m3", role: "system", content: "system" },
          { id: "m4", role: "assistant", content: "reply" },
        ],
      }),
    } as Response);

    const result = await getThreadMessages("t1");

    expect(result).toHaveLength(2);
    expect(result.map((m) => m.role)).toEqual(["user", "assistant"]);
  });

  it("throws on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 403 } as Response);

    await expect(getThreadMessages("t1")).rejects.toThrow("getThreadMessages failed (403)");
  });
});

describe("sendThreadMessage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs content to the thread messages endpoint and returns message_id + agent_triggered", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message_id: "new-msg-1", agent_triggered: true }),
    } as Response);

    const result = await sendThreadMessage("thread-42", "Hello world");

    expect(result).toEqual({ message_id: "new-msg-1", agent_triggered: true });
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/threads/thread-42/messages`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Hello world" }),
      }),
    );
  });

  it("throws on non-ok response with status code", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 409,
      text: async () => "conflict",
    } as Response);

    await expect(sendThreadMessage("t1", "msg")).rejects.toThrow("sendThreadMessage failed (409)");
  });

  it("URL-encodes the thread ID", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message_id: "x" }),
    } as Response);

    await sendThreadMessage("thread/with/slashes", "hi");

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledUrl).toBe(`${BASE}/api/v1/threads/thread%2Fwith%2Fslashes/messages`);
  });
});
