/**
 * T3 — agent-chat module
 *
 * Covers:
 *   - chat.ts: createChatSession posts to correct URL
 *   - chat.ts: streamChatTurn SSE event parsing (delta, tool_start, tool_result, artifact_saved, done)
 *   - FeatureSessionPage: renders AgentChatPanel alongside FeatureTabView in a flex split
 *   - MessageThread: renders messages and loader
 *   - PromptInput: textarea submit and keyboard shortcut
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// ─── chat.ts unit tests ───────────────────────────────────────────────────────

import {
  createChatSession,
  getSessionMessages,
  listChatSessions,
} from "../services/workflow-backend/chat";
import type { ChatSessionSummary } from "../services/workflow-backend/chat";

const API_BASE = "http://localhost:9000";

describe("createChatSession", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.NEXT_PUBLIC_WORKFLOW_API_URL = API_BASE;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_WORKFLOW_API_URL;
  });

  it("POSTs to the correct session URL", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ session_id: "sess_abc123" }),
    });

    const result = await createChatSession("ws-1", "feat-1");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_BASE}/api/workspaces/ws-1/features/feat-1/chat/session`);
    expect(init.method).toBe("POST");
    expect(result.session_id).toBe("sess_abc123");
  });

  it("throws on non-OK response", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => "Service Unavailable",
    });

    await expect(
      createChatSession("ws-1", "feat-1"),
    ).rejects.toThrow("503");
  });
});

// ─── listChatSessions ─────────────────────────────────────────────────────────

describe("listChatSessions", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.NEXT_PUBLIC_WORKFLOW_API_URL = API_BASE;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_WORKFLOW_API_URL;
  });

  it("GETs the sessions endpoint with correct URL", async () => {
    const sessions: ChatSessionSummary[] = [
      { id: "s1", title: "Session 1", started_at: 1000, last_active_at: 2000, last_message_excerpt: "hello" },
    ];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sessions }),
    });

    const result = await listChatSessions("ws-abc", "feat-xyz");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit | undefined];
    expect(url).toBe(`${API_BASE}/api/workspaces/ws-abc/features/feat-xyz/chat/sessions`);
    expect(result).toEqual(sessions);
  });

  it("throws on non-OK response", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(listChatSessions("ws-1", "feat-1")).rejects.toThrow("listChatSessions failed (404)");
  });

  it("returns an empty array when sessions list is empty", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ sessions: [] }) });
    const result = await listChatSessions("ws-1", "feat-1");
    expect(result).toEqual([]);
  });
});

// ─── getSessionMessages ───────────────────────────────────────────────────────

describe("getSessionMessages", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.NEXT_PUBLIC_WORKFLOW_API_URL = API_BASE;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_WORKFLOW_API_URL;
  });

  it("GETs the messages endpoint with correct URL and maps user/assistant rows", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        session_id: "s1",
        messages: [
          { id: "1", role: "user", content: "hi" },
          {
            id: "2",
            role: "assistant",
            content: "hello",
            tool_calls: [{ id: "c1", function: { name: "search" } }],
          },
        ],
      }),
    });

    const result = await getSessionMessages("ws-1", "feat-1", "s1");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit | undefined];
    expect(url).toBe(
      `${API_BASE}/api/workspaces/ws-1/features/feat-1/chat/sessions/s1/messages`,
    );
    expect(result).toEqual([
      { id: "1", role: "user", content: "hi" },
      {
        id: "2",
        role: "assistant",
        content: "hello",
        toolCalls: [{ callId: "c1", name: "search", status: "done" }],
      },
    ]);
  });

  it("filters out non-user/assistant (e.g. tool) rows", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        session_id: "s1",
        messages: [
          { id: "1", role: "user", content: "hi" },
          { id: "2", role: "tool", content: "{...}", tool_name: "search" },
          { id: "3", role: "assistant", content: "done" },
        ],
      }),
    });

    const result = await getSessionMessages("ws-1", "feat-1", "s1");
    expect(result.map((m) => m.id)).toEqual(["1", "3"]);
  });

  it("throws on non-OK response", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(getSessionMessages("ws-1", "feat-1", "s1")).rejects.toThrow(
      "getSessionMessages failed (404)",
    );
  });
});

// ─── SSE event parsing via streamChatTurn ────────────────────────────────────

import { streamChatTurn } from "../services/workflow-backend/chat";
import type { HermesEvent } from "../services/workflow-backend/chat";

vi.mock("@microsoft/fetch-event-source", () => ({
  fetchEventSource: vi.fn(),
}));

import { fetchEventSource } from "@microsoft/fetch-event-source";

type OnMessageFn = (ev: { event?: string; data: string }) => void;

describe("streamChatTurn SSE parsing", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_WORKFLOW_API_URL = API_BASE;
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_WORKFLOW_API_URL;
  });

  function captureEvents(
    sseFrames: Array<{ event?: string; data: string }>,
  ): HermesEvent[] {
    const events: HermesEvent[] = [];
    const mockFetch = fetchEventSource as ReturnType<typeof vi.fn>;
    mockFetch.mockImplementationOnce(
      async (
        _url: string,
        opts: { onmessage: OnMessageFn; onclose: () => void },
      ) => {
        for (const frame of sseFrames) {
          opts.onmessage(frame);
        }
        opts.onclose();
      },
    );

    streamChatTurn(
      { workspaceId: "ws-1", featureId: "feat-1", sessionId: "sess-x", message: "hi" },
      (ev) => events.push(ev),
      () => {},
      () => {},
    );

    return events;
  }

  // Helpers to build hermes-native /v1/chat/completions frames.
  const contentChunk = (content: string) =>
    JSON.stringify({
      object: "chat.completion.chunk",
      choices: [{ index: 0, delta: { content }, finish_reason: null }],
    });

  it("parses an OpenAI content chunk as a delta event", () => {
    const events = captureEvents([{ event: undefined, data: contentChunk("Hello") }]);
    expect(events).toContainEqual({ type: "delta", text: "Hello" });
  });

  it("ignores the leading role chunk (no content)", () => {
    const events = captureEvents([
      {
        event: undefined,
        data: JSON.stringify({
          object: "chat.completion.chunk",
          choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
        }),
      },
    ]);
    expect(events).toHaveLength(0);
  });

  it("parses hermes.tool.progress (running) as tool_start event", () => {
    const events = captureEvents([
      {
        event: "hermes.tool.progress",
        data: JSON.stringify({ tool: "workflow_get_feature_state", toolCallId: "c1", status: "running" }),
      },
    ]);
    expect(events).toContainEqual({
      type: "tool_start",
      name: "workflow_get_feature_state",
      callId: "c1",
    });
  });

  it("parses hermes.tool.progress (completed) as tool_result event", () => {
    const events = captureEvents([
      {
        event: "hermes.tool.progress",
        data: JSON.stringify({ tool: "workflow_get_feature_state", toolCallId: "c1", status: "completed" }),
      },
    ]);
    expect(events).toContainEqual({
      type: "tool_result",
      name: "workflow_get_feature_state",
      callId: "c1",
      output: undefined,
    });
  });

  it("parses hermes.artifact.saved event", () => {
    const events = captureEvents([
      { event: "hermes.artifact.saved", data: JSON.stringify({ artifact: "product_spec" }) },
    ]);
    expect(events).toContainEqual({ type: "artifact_saved", artifact: "product_spec" });
  });

  it("fires done event on [DONE] frame", () => {
    const events = captureEvents([{ event: undefined, data: "[DONE]" }]);
    expect(events).toContainEqual({ type: "done" });
  });

  it("parses the finish chunk usage as a usage event", () => {
    const events = captureEvents([
      {
        event: undefined,
        data: JSON.stringify({
          object: "chat.completion.chunk",
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        }),
      },
    ]);
    expect(events).toContainEqual({ type: "usage", inputTokens: 10, outputTokens: 20, cachedTokens: 0 });
  });

  it("parses a finish_reason=error chunk as an error event", () => {
    const events = captureEvents([
      {
        event: undefined,
        data: JSON.stringify({
          object: "chat.completion.chunk",
          choices: [{ index: 0, delta: {}, finish_reason: "error" }],
          hermes: { error: "agent blew up" },
        }),
      },
    ]);
    expect(events).toContainEqual({ type: "error", message: "agent blew up" });
  });
});

// ─── FeatureSessionPage layout ────────────────────────────────────────────────

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const original = await importOriginal() as Record<string, unknown>;
  return {
    ...original,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

vi.mock("../features/board/components/FeatureTabView/FeatureTabView", () => ({
  FeatureTabView: () => React.createElement("div", { "data-feature-tab-view": "" }),
}));

vi.mock("../features/agent-chat", () => ({
  AgentChatPanel: () => React.createElement("div", { "data-agent-chat-panel": "" }),
}));

vi.mock("../features/feature-status/FeatureStatusPanel", () => ({
  FeatureStatusPanel: () => React.createElement("div", { "data-feature-status-panel": "" }),
}));

vi.mock("../features/feature-status/CollapseToggle", () => ({
  CollapseToggle: ({ side }: { side: string }) =>
    React.createElement("button", { "data-collapse-toggle": "", "data-side": side }),
}));

vi.mock("../hooks/useLocalStorage", () => ({
  useLocalStorage: vi.fn((key: string) => {
    if (key === "df-left-panel-collapsed") return [false, vi.fn()];
    if (key === "df-right-panel-collapsed") return [false, vi.fn()];
    return [false, vi.fn()];
  }),
}));

// Avoid rendering WorkspaceHeader which requires SessionProvider
vi.mock("../features/workspaces/components/WorkspaceSessionPage/WorkspaceSessionShared", async (importOriginal) => {
  const original = await importOriginal() as Record<string, unknown>;
  return {
    ...original,
    WorkspaceSessionShell: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", { "data-workspace-shell": "" }, children),
  };
});

const mockWorkspaceCtx = vi.hoisted(() => ({
  activeSurface: "board" as string,
  activeTaskTabId: null as string | null,
  activeFeatureTabId: null as string | null,
  openTaskTabs: [] as unknown[],
  openFeatureTabs: [] as unknown[],
  activeWorkspace: {
    id: "ws-1",
    name: "Test WS",
    slug: "test-ws",
    source_state: null,
    features: [],
    tasks: [],
  },
  loadingWorkspace: false,
  workspaceError: null,
  selectedWorkspaceId: "ws-1",
  selectWorkspace: vi.fn(),
  openTaskTab: vi.fn(),
  closeTaskTab: vi.fn(),
  activateTaskTab: vi.fn(),
  openFeatureTab: vi.fn(),
  closeFeatureTab: vi.fn(),
  activateFeatureTab: vi.fn(),
  markFeatureTabActive: vi.fn(),
  goToBoard: vi.fn(),
  setActiveSurface: vi.fn(),
}));

vi.mock("../features/workspaces/context/WorkspaceContext", () => ({
  useWorkspaceContext: () => mockWorkspaceCtx,
}));

import { FeatureSessionPage } from "../features/workspaces/components/WorkspaceSessionPage/FeatureSessionPage";

describe("FeatureSessionPage layout", () => {
  it("renders FeatureStatusPanel, FeatureTabView, and AgentChatPanel in a three-panel flex layout", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureSessionPage, {
        sessionId: "sess-1",
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );

    expect(html).toContain('data-feature-status-panel');
    expect(html).toContain('data-feature-tab-view');
    expect(html).toContain('data-agent-chat-panel');

    // The outer wrapper uses flex + overflow-hidden
    expect(html).toMatch(/class="[^"]*flex[^"]*min-h-0[^"]*flex-1[^"]*overflow-hidden/);

    // Left panel is w-64 when expanded
    expect(html).toMatch(/data-left-panel[^>]*class="[^"]*w-64/);
    // Right panel is w-96 when expanded
    expect(html).toMatch(/data-right-panel[^>]*class="[^"]*w-96/);
  });

  it("shows error state when workspaceId is missing", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureSessionPage, {
        sessionId: "sess-1",
        workspaceId: "",
        featureId: "feat-1",
      }),
    );
    expect(html).toContain("Missing feature route parameters");
  });
});

// ─── MessageThread rendering ─────────────────────────────────────────────────

import { MessageThread } from "../features/agent-chat/MessageThread";
import type { HermesMessage } from "../features/agent-chat/types";

describe("MessageThread", () => {
  it("shows empty state when no messages and idle", () => {
    const html = renderToStaticMarkup(
      React.createElement(MessageThread, { messages: [], status: "idle" }),
    );
    expect(html).toContain("data-message-thread-empty");
  });

  it("renders user and assistant messages", () => {
    const msgs: HermesMessage[] = [
      { id: "1", role: "user", content: "Hello agent" },
      { id: "2", role: "assistant", content: "Hello human" },
    ];
    const html = renderToStaticMarkup(
      React.createElement(MessageThread, { messages: msgs, status: "idle" }),
    );
    expect(html).toContain("data-message-thread");
    expect(html).toContain("Hello agent");
    expect(html).toContain("Hello human");
  });

  it("shows loader when streaming", () => {
    const html = renderToStaticMarkup(
      React.createElement(MessageThread, { messages: [], status: "streaming" }),
    );
    expect(html).toContain("data-agent-loader");
  });

  it("shows loader when connecting", () => {
    const html = renderToStaticMarkup(
      React.createElement(MessageThread, { messages: [], status: "connecting" }),
    );
    expect(html).toContain("data-agent-loader");
  });
});

// ─── PromptInput rendering ────────────────────────────────────────────────────

import { PromptInput } from "../features/agent-chat/PromptInput";

describe("PromptInput", () => {
  it("renders textarea and submit button", () => {
    const html = renderToStaticMarkup(
      React.createElement(PromptInput, {
        value: "",
        onChange: vi.fn(),
        onSubmit: vi.fn(),
        status: "idle",
      }),
    );
    expect(html).toContain("data-prompt-input");
    expect(html).toContain("data-prompt-textarea");
    expect(html).toContain("data-prompt-submit");
  });

  it("disables textarea when streaming", () => {
    const html = renderToStaticMarkup(
      React.createElement(PromptInput, {
        value: "hello",
        onChange: vi.fn(),
        onSubmit: vi.fn(),
        status: "streaming",
      }),
    );
    expect(html).toContain('disabled=""');
  });

  it("disables submit button when input is empty", () => {
    const html = renderToStaticMarkup(
      React.createElement(PromptInput, {
        value: "",
        onChange: vi.fn(),
        onSubmit: vi.fn(),
        status: "idle",
      }),
    );
    // Submit button disabled when value is empty string
    expect(html).toContain('disabled=""');
  });
});
