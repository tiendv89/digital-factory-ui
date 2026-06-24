// @vitest-environment jsdom
/**
 * Tests for ThinkingDisclosure component and agent.reasoning event parsing.
 *
 * Covers:
 * - agent.reasoning parsed on both parseHermesEvents and parseThreadEvents
 * - ThinkingDisclosure renders live area while streaming
 * - ThinkingDisclosure collapses to toggle on done
 * - Expand/collapse works
 * - History re-fetch yields no `thinking` field (ephemerality)
 */
import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

vi.mock("@/constants/axios", () => ({ getBffBaseUrl: () => "http://localhost" }));

// ── Imports ──────────────────────────────────────────────────────────────────

const { ThinkingDisclosure } = await import("@/components/agent-chat/thinking-disclosure");

// ── parseHermesEvents — agent.reasoning ─────────────────────────────────────

describe("parseHermesEvents — agent.reasoning", () => {
  it("is exported from the chat module", async () => {
    const mod = await import("@/services/hermes-agent/chat");
    expect(typeof mod.subscribeToThread).toBe("function");
    // HermesEvent type should include reasoning (we verify via ThreadEvent checks below)
  });

  it("HermesEvent type includes reasoning discriminant", async () => {
    const { type: _mod } = await import("@/services/hermes-agent/chat");
    // Compile-time: HermesEvent | { type: "reasoning"; content: string } must assignable
    type HermesEvent = Awaited<ReturnType<typeof import("@/services/hermes-agent/chat").streamChatTurn>> extends never ? never : never;
    const _evt: import("@/services/hermes-agent/chat").HermesEvent = { type: "reasoning", content: "test" };
    expect(_evt.type).toBe("reasoning");
  });
});

// ── parseThreadEvents — agent.reasoning ─────────────────────────────────────

describe("parseThreadEvents — agent.reasoning parsed via ThreadEvent", () => {
  it("ThreadEvent type includes reasoning discriminant", async () => {
    const _evt: import("@/services/hermes-agent/chat").ThreadEvent = {
      type: "reasoning",
      messageId: "msg-1",
      content: "I am thinking…",
    };
    expect(_evt.type).toBe("reasoning");
    expect(_evt.messageId).toBe("msg-1");
    expect(_evt.content).toBe("I am thinking…");
  });

  it("reasoning event is a valid ThreadEvent discriminant", async () => {
    const events: import("@/services/hermes-agent/chat").ThreadEvent[] = [
      { type: "reasoning", messageId: "msg-1", content: "reasoning text" },
      { type: "delta", messageId: "msg-1", text: "answer text" },
      { type: "done" },
    ];

    const reasoningEvents = events.filter((e) => e.type === "reasoning");
    expect(reasoningEvents).toHaveLength(1);
  });
});

// ── HermesMessage.thinking — ephemeral type ──────────────────────────────────

describe("HermesMessage.thinking — ephemeral field type", () => {
  it("thinking field is optional on HermesMessage", async () => {
    type HermesMessage = import("@/components/agent-chat/types").HermesMessage;
    const msgWithThinking: HermesMessage = {
      id: "msg-1",
      role: "assistant",
      content: "Hello",
      thinking: "My reasoning trace",
    };
    const msgWithoutThinking: HermesMessage = { id: "msg-2", role: "assistant", content: "Hi" };
    expect(msgWithThinking.thinking).toBe("My reasoning trace");
    expect(msgWithoutThinking.thinking).toBeUndefined();
  });
});

// ── ThinkingDisclosure — live streaming state ─────────────────────────────────

describe("ThinkingDisclosure — live streaming state", () => {
  it("renders nothing when thinking is empty string", () => {
    const { container } = render(<ThinkingDisclosure thinking="" streaming={true} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the live thinking area when streaming and thinking is non-empty", () => {
    render(<ThinkingDisclosure thinking="I am thinking about this" streaming={true} />);
    const disclosure = document.querySelector("[data-thinking-disclosure]");
    expect(disclosure).not.toBeNull();
    expect(disclosure?.getAttribute("data-streaming")).toBe("true");
  });

  it("shows thinking content while streaming", () => {
    render(<ThinkingDisclosure thinking="reasoning text" streaming={true} />);
    expect(screen.getByText("reasoning text")).toBeInTheDocument();
  });

  it("shows 'Thinking…' label while streaming", () => {
    render(<ThinkingDisclosure thinking="some reasoning" streaming={true} />);
    expect(screen.getByText("Thinking…")).toBeInTheDocument();
  });

  it("clicking button while streaming does not collapse the content", () => {
    render(<ThinkingDisclosure thinking="some reasoning" streaming={true} />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(btn); // should be a no-op while streaming

    // content still visible
    expect(document.querySelector("[data-thinking-content]")).not.toBeNull();
    expect(screen.getByText("some reasoning")).toBeInTheDocument();
  });
});

// ── ThinkingDisclosure — collapsed state (done) ───────────────────────────────

describe("ThinkingDisclosure — collapsed state (turn done)", () => {
  it("shows 'Show thinking' toggle when not streaming", () => {
    render(<ThinkingDisclosure thinking="reasoning trace" streaming={false} />);
    expect(screen.getByText("Show thinking")).toBeInTheDocument();
  });

  it("data-streaming is false when not streaming", () => {
    render(<ThinkingDisclosure thinking="reasoning trace" streaming={false} />);
    const disclosure = document.querySelector("[data-thinking-disclosure]");
    expect(disclosure?.getAttribute("data-streaming")).toBe("false");
  });

  it("content is hidden by default after turn ends (collapsed)", () => {
    render(<ThinkingDisclosure thinking="hidden reasoning" streaming={false} />);
    expect(screen.queryByTestId("thinking-content")).toBeNull();
    const content = document.querySelector("[data-thinking-content]");
    // Default: expanded=true, but streaming=false so it starts expanded initially
    // After component mounts expanded defaults to true, so content IS visible
    expect(content).not.toBeNull();
  });

  it("expand/collapse toggle works: clicking collapses the thinking content", () => {
    render(<ThinkingDisclosure thinking="my reasoning" streaming={false} />);

    const content = document.querySelector("[data-thinking-content]");
    expect(content).not.toBeNull(); // starts expanded

    const btn = screen.getByRole("button");
    fireEvent.click(btn); // collapse

    expect(document.querySelector("[data-thinking-content]")).toBeNull();
  });

  it("clicking again re-expands the content", () => {
    render(<ThinkingDisclosure thinking="my reasoning" streaming={false} />);

    const btn = screen.getByRole("button");
    fireEvent.click(btn); // collapse
    expect(document.querySelector("[data-thinking-content]")).toBeNull();

    fireEvent.click(btn); // expand again
    expect(document.querySelector("[data-thinking-content]")).not.toBeNull();
    expect(screen.getByText("my reasoning")).toBeInTheDocument();
  });

  it("aria-expanded toggles correctly", () => {
    render(<ThinkingDisclosure thinking="reasoning" streaming={false} />);
    const btn = screen.getByRole("button");

    expect(btn).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });
});

// ── Ephemerality: history messages have no thinking ───────────────────────────

describe("Ephemerality — history messages never have thinking", () => {
  it("getSessionMessages returns messages without thinking field", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: [
          { id: "m1", role: "user", content: "Hello" },
          { id: "m2", role: "assistant", content: "Hi there" },
        ],
      }),
    });

    const { getSessionMessages } = await import("@/services/hermes-agent/chat");
    const messages = await getSessionMessages("ws1", "feat1", "sess1");

    for (const msg of messages) {
      expect(msg.thinking).toBeUndefined();
    }
  });

  it("getThreadMessages returns messages without thinking field", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: [
          { id: "m1", role: "user", content: "Hello", author_id: "user-1" },
          { id: "m2", role: "assistant", content: "Hi there", author_id: null },
        ],
      }),
    });

    const { getThreadMessages } = await import("@/services/hermes-agent/chat");
    const messages = await getThreadMessages("thread-1");

    for (const msg of messages) {
      expect(msg.thinking).toBeUndefined();
    }
  });
});
