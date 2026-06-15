import { describe, expect, it } from "vitest";

import type { HermesMessage, MessageAuthor } from "@/components/agent-chat/types";

// Pure logic tests for attribution — we test the data shape rather than
// rendering (which requires jsdom / React) to keep these fast and environment-free.

describe("HermesMessage author field", () => {
  it("accepts a message without author (legacy)", () => {
    const msg: HermesMessage = { id: "m1", role: "user", content: "hello" };
    expect(msg.author).toBeUndefined();
  });

  it("accepts a user message with full author", () => {
    const author: MessageAuthor = {
      id: "u1",
      name: "Alice",
      avatarUrl: "https://example.com/a.png",
      roleLabel: "PO",
    };
    const msg: HermesMessage = { id: "m1", role: "user", content: "hello", author };
    expect(msg.author).toEqual(author);
  });

  it("accepts an assistant message with agent sentinel", () => {
    const author: MessageAuthor = { id: "agent", name: "@agent", avatarUrl: null, roleLabel: null };
    const msg: HermesMessage = { id: "m2", role: "assistant", content: "reply", author };
    expect(msg.author?.id).toBe("agent");
  });

  it("accepts author with null optional fields", () => {
    const author: MessageAuthor = { id: "u2", name: "Bob", avatarUrl: null, roleLabel: null };
    const msg: HermesMessage = { id: "m3", role: "user", content: "hi", author };
    expect(msg.author?.avatarUrl).toBeNull();
    expect(msg.author?.roleLabel).toBeNull();
  });

  it("toolCalls and author can coexist", () => {
    const author: MessageAuthor = { id: "agent", name: "@agent" };
    const msg: HermesMessage = {
      id: "m4",
      role: "assistant",
      content: "",
      author,
      toolCalls: [{ callId: "c1", name: "workflow_request_approval", status: "done" }],
    };
    expect(msg.author).toBeDefined();
    expect(msg.toolCalls).toHaveLength(1);
  });
});
