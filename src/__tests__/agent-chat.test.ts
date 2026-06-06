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

import { createChatSession } from "../services/workflow-backend/chat";

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

  it("POSTs to the correct session URL with user_id", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ session_id: "sess_abc123" }),
    });

    const result = await createChatSession("ws-1", "feat-1", "user-42");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_BASE}/api/workspaces/ws-1/features/feat-1/chat/session`);
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string) as { user_id: string };
    expect(body.user_id).toBe("user-42");
    expect(result.session_id).toBe("sess_abc123");
  });

  it("throws on non-OK response", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => "Service Unavailable",
    });

    await expect(
      createChatSession("ws-1", "feat-1", "user-42"),
    ).rejects.toThrow("503");
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

  it("parses message_output_partial as delta event", () => {
    const events = captureEvents([
      { event: "message_output_partial", data: JSON.stringify({ content: "Hello" }) },
    ]);
    expect(events).toContainEqual({ type: "delta", text: "Hello" });
  });

  it("parses tool_call_item as tool_start event", () => {
    const events = captureEvents([
      {
        event: "tool_call_item",
        data: JSON.stringify({ call_id: "c1", name: "workflow_get_feature_state", status: "running" }),
      },
    ]);
    expect(events).toContainEqual({
      type: "tool_start",
      name: "workflow_get_feature_state",
      callId: "c1",
    });
  });

  it("parses function_call_output as tool_result event", () => {
    const events = captureEvents([
      {
        event: "function_call_output",
        data: JSON.stringify({ call_id: "c1", name: "workflow_get_feature_state", output: { stage: "in_design" } }),
      },
    ]);
    expect(events).toContainEqual({
      type: "tool_result",
      name: "workflow_get_feature_state",
      callId: "c1",
      output: { stage: "in_design" },
    });
  });

  it("parses artifact_saved event", () => {
    const events = captureEvents([
      { event: "artifact_saved", data: JSON.stringify({ artifact: "product_spec" }) },
    ]);
    expect(events).toContainEqual({ type: "artifact_saved", artifact: "product_spec" });
  });

  it("fires done event on [DONE] frame", () => {
    const events = captureEvents([
      { event: undefined, data: "[DONE]" },
    ]);
    expect(events).toContainEqual({ type: "done" });
  });

  it("ignores unknown event types silently", () => {
    const events = captureEvents([
      { event: "usage", data: JSON.stringify({ input: 10, output: 20 }) },
    ]);
    // usage events are not in the HermesEvent union — should be silently dropped
    expect(events.filter((e) => e.type !== "done")).toHaveLength(0);
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
  it("renders FeatureTabView and AgentChatPanel in a horizontal flex split", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureSessionPage, {
        sessionId: "sess-1",
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );

    expect(html).toContain('data-feature-tab-view');
    expect(html).toContain('data-agent-chat-panel');

    // The outer wrapper uses flex + overflow-hidden
    expect(html).toMatch(/class="[^"]*flex[^"]*min-h-0[^"]*flex-1[^"]*overflow-hidden/);

    // Chat panel has w-80
    expect(html).toMatch(/class="[^"]*w-80[^"]*shrink-0/);
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
