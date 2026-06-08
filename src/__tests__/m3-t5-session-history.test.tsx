/**
 * T5 — session history + AgentChatPanel refactor
 *
 * Covers:
 *   - SessionHistoryList: renders session rows (title, excerpt, relative date)
 *   - SessionHistoryList: renders "No conversations yet." when sessions=[]
 *   - SessionHistoryList: renders loading state when loading=true
 *   - SessionHistoryList: calls onSelect with session id on row click
 *   - AgentChatPanel: starts in history mode (SessionHistoryList visible)
 *   - AgentChatPanel: on mount does NOT call createChatSession (lazy creation)
 *   - AgentChatPanel: selecting a session transitions to active mode
 *   - AgentChatPanel: back button returns to history mode
 *   - AgentChatPanel: submit from history calls createChatSession before streamChatTurn
 *   - AgentChatPanel: graceful empty state when listChatSessions fails
 *   - AgentChatPanel: back button re-fetches session list
 */

// @vitest-environment jsdom

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { render, act, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ChatSessionSummary } from "../services/workflow-backend/chat";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@microsoft/fetch-event-source", () => ({
  fetchEventSource: vi.fn(),
}));

const mockCreateSession = vi.hoisted(() => vi.fn());
const mockListSessions = vi.hoisted(() => vi.fn());
const mockStreamChatTurn = vi.hoisted(() => vi.fn());

vi.mock("../services/workflow-backend/chat", () => ({
  createChatSession: mockCreateSession,
  listChatSessions: mockListSessions,
  streamChatTurn: mockStreamChatTurn,
}));

// Mock Conversation to avoid scrollRef / ResizeObserver complexity in jsdom
vi.mock("../features/agent-chat/Conversation", () => ({
  Conversation: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-conversation": "" }, children),
  ConversationContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-conversation-content": "" }, children),
  useConversationScroll: () => ({
    scrollRef: { current: null },
    isAtBottomRef: { current: true },
    isAtBottom: true,
    scrollToBottom: vi.fn(),
  }),
}));

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeSessions(count: number): ChatSessionSummary[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `s-${i + 1}`,
    title: `Session ${i + 1}`,
    started_at: Date.now() - 1_000_000 * (i + 1),
    last_active_at: Date.now() - 60_000 * (i + 1),
    last_message_excerpt: `Excerpt for session ${i + 1}`,
  }));
}

// ─── SessionHistoryList ──────────────────────────────────────────────────────

import { SessionHistoryList } from "../features/agent-chat/SessionHistoryList";

describe("SessionHistoryList", () => {
  it("renders 'No conversations yet.' when sessions is empty", () => {
    const html = renderToStaticMarkup(
      React.createElement(SessionHistoryList, {
        sessions: [],
        loading: false,
        onSelect: vi.fn(),
      }),
    );
    expect(html).toContain("No conversations yet.");
    expect(html).toContain("data-session-history-list");
  });

  it("renders loading state when loading=true", () => {
    const html = renderToStaticMarkup(
      React.createElement(SessionHistoryList, {
        sessions: [],
        loading: true,
        onSelect: vi.fn(),
      }),
    );
    expect(html).toContain("data-session-history-list");
    expect(html).toContain("Loading");
    expect(html).not.toContain("No conversations yet.");
  });

  it("renders a row for each session with title and excerpt", () => {
    const sessions = makeSessions(3);
    const html = renderToStaticMarkup(
      React.createElement(SessionHistoryList, {
        sessions,
        loading: false,
        onSelect: vi.fn(),
      }),
    );
    for (const s of sessions) {
      expect(html).toContain(`data-session-row="${s.id}"`);
      expect(html).toContain(s.title);
      expect(html).toContain(s.last_message_excerpt);
    }
  });

  it("renders session title in bold (font-semibold)", () => {
    const sessions = makeSessions(1);
    const html = renderToStaticMarkup(
      React.createElement(SessionHistoryList, {
        sessions,
        loading: false,
        onSelect: vi.fn(),
      }),
    );
    expect(html).toContain("font-semibold");
    expect(html).toContain(sessions[0].title);
  });

  it("calls onSelect with the session id when a row is clicked", () => {
    const sessions = makeSessions(2);
    const onSelect = vi.fn();
    const { container } = render(
      React.createElement(SessionHistoryList, {
        sessions,
        loading: false,
        onSelect,
      }),
    );

    const firstRow = container.querySelector(`[data-session-row="s-1"]`);
    expect(firstRow).not.toBeNull();
    fireEvent.click(firstRow!);
    expect(onSelect).toHaveBeenCalledWith("s-1");

    const secondRow = container.querySelector(`[data-session-row="s-2"]`);
    fireEvent.click(secondRow!);
    expect(onSelect).toHaveBeenCalledWith("s-2");
  });
});

// ─── AgentChatPanel state machine ────────────────────────────────────────────

import { AgentChatPanel } from "../features/agent-chat/AgentChatPanel";

const API_BASE = "http://localhost:9000";

describe("AgentChatPanel — history/active state machine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_WORKFLOW_API_URL = API_BASE;
    // Default: listChatSessions resolves to empty list
    mockListSessions.mockResolvedValue([]);
    // Default: createChatSession returns a session
    mockCreateSession.mockResolvedValue({ session_id: "new-sess-1" });
    // Default: streamChatTurn returns a no-op abort controller
    mockStreamChatTurn.mockReturnValue(new AbortController());
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_WORKFLOW_API_URL;
    vi.restoreAllMocks();
  });

  it("starts in history mode — shows SessionHistoryList on mount", async () => {
    const { container } = render(
      React.createElement(AgentChatPanel, {
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );

    await waitFor(() => {
      expect(mockListSessions).toHaveBeenCalledWith("ws-1", "feat-1");
    });

    expect(container.querySelector("[data-session-history-list]")).not.toBeNull();
  });

  it("does NOT call createChatSession on mount (lazy session creation)", async () => {
    render(
      React.createElement(AgentChatPanel, {
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );

    await waitFor(() => {
      expect(mockListSessions).toHaveBeenCalled();
    });

    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("selecting a session transitions to active mode", async () => {
    const sessions: ChatSessionSummary[] = [
      { id: "sess-abc", title: "My Chat", started_at: 1000, last_active_at: 2000, last_message_excerpt: "hi" },
    ];
    mockListSessions.mockResolvedValue(sessions);

    const { container } = render(
      React.createElement(AgentChatPanel, {
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );

    await waitFor(() => {
      expect(container.querySelector(`[data-session-row="sess-abc"]`)).not.toBeNull();
    });

    await act(async () => {
      fireEvent.click(container.querySelector(`[data-session-row="sess-abc"]`)!);
    });

    // Should now be in active mode: back button visible, conversation visible
    expect(container.querySelector("[data-back-button]")).not.toBeNull();
    expect(container.querySelector("[data-conversation]")).not.toBeNull();
    // History list should be gone
    expect(container.querySelector("[data-session-history-list]")).toBeNull();
  });

  it("back button in active mode returns to history mode", async () => {
    const sessions: ChatSessionSummary[] = [
      { id: "sess-1", title: "First Chat", started_at: 1000, last_active_at: 2000, last_message_excerpt: "" },
    ];
    mockListSessions.mockResolvedValue(sessions);

    const { container } = render(
      React.createElement(AgentChatPanel, {
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );

    await waitFor(() => {
      expect(container.querySelector(`[data-session-row="sess-1"]`)).not.toBeNull();
    });

    await act(async () => {
      fireEvent.click(container.querySelector(`[data-session-row="sess-1"]`)!);
    });

    expect(container.querySelector("[data-back-button]")).not.toBeNull();

    await act(async () => {
      fireEvent.click(container.querySelector("[data-back-button]")!);
    });

    await waitFor(() => {
      expect(container.querySelector("[data-session-history-list]")).not.toBeNull();
    });
    expect(container.querySelector("[data-back-button]")).toBeNull();
  });

  it("submitting from history mode calls createChatSession before streamChatTurn", async () => {
    mockListSessions.mockResolvedValue([]);

    const { container } = render(
      React.createElement(AgentChatPanel, {
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );

    await waitFor(() => {
      expect(container.querySelector("[data-session-history-list]")).not.toBeNull();
    });

    const textarea = container.querySelector("[data-prompt-textarea]") as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();

    fireEvent.change(textarea, { target: { value: "Hello agent" } });

    await act(async () => {
      fireEvent.keyDown(textarea, { key: "Enter" });
    });

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith("ws-1", "feat-1");
    });

    await waitFor(() => {
      expect(mockStreamChatTurn).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: "new-sess-1", message: "Hello agent" }),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      );
    });

    // createChatSession must have been invoked before streamChatTurn
    const createOrder = mockCreateSession.mock.invocationCallOrder[0];
    const streamOrder = mockStreamChatTurn.mock.invocationCallOrder[0];
    expect(createOrder).toBeLessThan(streamOrder);
  });

  it("graceful empty state when listChatSessions fails (404)", async () => {
    mockListSessions.mockRejectedValue(new Error("listChatSessions failed (404)"));

    const { container } = render(
      React.createElement(AgentChatPanel, {
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );

    await waitFor(() => {
      expect(container.querySelector("[data-session-history-list]")).not.toBeNull();
    });

    expect(container.textContent).toContain("No conversations yet.");
  });

  it("back button re-fetches the session list", async () => {
    const sessions: ChatSessionSummary[] = [
      { id: "s1", title: "Chat A", started_at: 1000, last_active_at: 2000, last_message_excerpt: "" },
    ];
    mockListSessions.mockResolvedValue(sessions);

    const { container } = render(
      React.createElement(AgentChatPanel, {
        workspaceId: "ws-1",
        featureId: "feat-1",
      }),
    );

    await waitFor(() => {
      expect(container.querySelector(`[data-session-row="s1"]`)).not.toBeNull();
    });

    await act(async () => {
      fireEvent.click(container.querySelector(`[data-session-row="s1"]`)!);
    });

    const callsBefore = mockListSessions.mock.calls.length;

    await act(async () => {
      fireEvent.click(container.querySelector("[data-back-button]")!);
    });

    await waitFor(() => {
      expect(mockListSessions.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});
