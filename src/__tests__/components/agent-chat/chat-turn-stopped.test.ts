import { describe, expect, it } from "vitest";

// Unit tests for the turn.stopped SSE event parsing in parseThreadEvents.
// We test the exported ThreadEvent type shape and the cancelAgentTurn function signature.

import type { ThreadEvent } from "@/services/hermes-agent/chat";

describe("ThreadEvent — turn.stopped type", () => {
  it("turn.stopped event has messageId that can be string or null", () => {
    const withId: ThreadEvent = { type: "turn.stopped", messageId: "msg-abc" };
    const withNull: ThreadEvent = { type: "turn.stopped", messageId: null };
    expect(withId.type).toBe("turn.stopped");
    expect(withId.messageId).toBe("msg-abc");
    expect(withNull.type).toBe("turn.stopped");
    expect(withNull.messageId).toBeNull();
  });

  it("turn.stopped is a valid ThreadEvent discriminant", () => {
    const events: ThreadEvent[] = [
      { type: "turn.stopped", messageId: "msg-1" },
      { type: "turn.stopped", messageId: null },
      { type: "done" },
    ];

    const stopped = events.filter((e) => e.type === "turn.stopped");
    expect(stopped).toHaveLength(2);
  });
});

describe("cancelAgentTurn — import", () => {
  it("is exported from the chat service module", async () => {
    const mod = await import("@/services/hermes-agent/chat");
    expect(typeof mod.cancelAgentTurn).toBe("function");
  });
});
