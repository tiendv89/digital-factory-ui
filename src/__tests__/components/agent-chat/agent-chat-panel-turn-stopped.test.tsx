// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ThreadEvent } from "@/services/hermes-agent/chat";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Capture the event handler subscribeToThread receives so tests can fire events.
let capturedOnEvent: ((event: ThreadEvent) => void) | null = null;

vi.mock("@/services/hermes-agent/chat", () => ({
  cancelAgentTurn: vi.fn().mockResolvedValue(undefined),
  createChatSession: vi.fn().mockResolvedValue({ id: "session-1", title: "Test" }),
  deleteAllSessions: vi.fn().mockResolvedValue(undefined),
  deleteSession: vi.fn().mockResolvedValue(undefined),
  getSessionMessages: vi.fn().mockResolvedValue([]),
  getThreadMessages: vi.fn().mockResolvedValue([]),
  getUnreadMentions: vi.fn().mockResolvedValue({ total: 0, perSession: {} }),
  listChatSessions: vi.fn().mockResolvedValue([]),
  listModels: vi.fn().mockResolvedValue({ models: [], default: "" }),
  markThreadRead: vi.fn().mockResolvedValue(undefined),
  sendThreadMessage: vi.fn().mockResolvedValue({ message_id: "msg-1", agent_triggered: true }),
  streamChatTurn: vi.fn().mockReturnValue(new AbortController()),
  subscribeToThread: vi.fn().mockImplementation((_id, _since, onEvent) => {
    capturedOnEvent = onEvent;
    return new AbortController();
  }),
}));

vi.mock("@/services/user-service", () => ({
  fetchMe: vi.fn().mockResolvedValue({}),
  fetchOrgMembers: vi.fn().mockResolvedValue([]),
  getMeData: vi.fn().mockReturnValue({ user: { id: "u1", email: "test@test.com", display_name: null, avatar_url: null }, org_workspace_ids: {} }),
  listWorkspaceMembers: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/stores/workspace", () => {
  const store = {
    lastModel: null,
    setLastModel: vi.fn(),
  };
  const fn = vi.fn(() => store);
  (fn as unknown as { getState: () => typeof store }).getState = () => store;
  return { useLocalWorkspaceStore: fn };
});

vi.mock("@heroui/react", async () => {
  const React = await import("react");
  const fragment = ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children);
  const ListBoxComponent = Object.assign(fragment, { Item: fragment });
  const SelectComponent = {
    Root: fragment,
    Trigger: ({ children }: { children: React.ReactNode }) => React.createElement("button", { type: "button" }, children),
    Value: ({ children }: { children: (args: { selectedText: string; isPlaceholder: boolean }) => React.ReactNode }) =>
      React.createElement(React.Fragment, null, children({ selectedText: "", isPlaceholder: true })),
    Popover: fragment,
  };
  return { ListBox: ListBoxComponent, Select: SelectComponent };
});

vi.mock("@/components/agent-chat/mention-picker", () => ({
  detectMention: () => null,
  insertMention: (_v: string, _a: number, _q: string, handle: string) => handle,
  MentionPicker: () => null,
}));

// Stub heavy child components — not under test here.
vi.mock("@/components/agent-chat/session-history-list", () => ({
  SessionHistoryList: () => null,
}));
vi.mock("@/components/agent-chat/slash-command-picker", () => ({
  SlashCommandPicker: () => null,
}));
vi.mock("@/components/agent-chat/message-thread", () => ({
  MessageThread: ({ messages }: { messages: unknown[] }) =>
    // Render a marker so tests can verify message count without full component.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("react").createElement("div", { "data-testid": "message-thread", "data-message-count": messages.length }),
}));
vi.mock("@/components/agent-chat/channel-message-list", () => ({
  ChannelMessageList: () => null,
}));
vi.mock("@/components/agent-chat/conversation", () => ({
  Conversation: ({ children }: { children: React.ReactNode }) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("react").createElement(require("react").Fragment, null, children),
}));

import { AgentChatPanel } from "@/components/agent-chat/agent-chat-panel";

describe("AgentChatPanel — turn.stopped with messageId: null", () => {
  beforeEach(() => {
    capturedOnEvent = null;
  });

  it("resets agentWorking to false without mutating messages when messageId is null", async () => {
    render(<AgentChatPanel workspaceId="ws-1" featureId="feat-1" useSubscriptionTransport={true} requestSessionId="session-1" />);

    // Wait for the session to be selected and subscription opened.
    await waitFor(() => expect(capturedOnEvent).not.toBeNull());

    // Fire agent.working — sets agentWorking=true, Stop button appears.
    await act(async () => {
      capturedOnEvent!({ type: "agent.working", sessionId: "session-1" });
    });

    expect(screen.getByRole("button", { name: /stop agent/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send message/i })).not.toBeInTheDocument();

    // Capture the message count before the event fires — it must not change.
    const threadEl = screen.getByTestId("message-thread");
    const messageCountBefore = threadEl.getAttribute("data-message-count");

    // Fire turn.stopped with messageId: null.
    await act(async () => {
      capturedOnEvent!({ type: "turn.stopped", messageId: null });
    });

    // (a) agentWorking reset: Send button visible, Stop button gone.
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /stop agent/i })).not.toBeInTheDocument();

    // (b) messages list not mutated: count unchanged.
    expect(screen.getByTestId("message-thread").getAttribute("data-message-count")).toBe(messageCountBefore);
  });
});
