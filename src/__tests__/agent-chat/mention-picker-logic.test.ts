import { describe, expect, it } from "vitest";

import { detectMention, insertMention } from "@/components/agent-chat/mention-picker";
import type { ThreadMember } from "@/components/agent-chat/types";

// Pure-logic tests for @-mention detection and insertion.
// No React rendering required — keeps the suite fast and environment-free.

describe("detectMention", () => {
  it("returns null when there is no @ before the caret", () => {
    expect(detectMention("hello world", 11)).toBeNull();
  });

  it("detects a bare @ at the end of the text", () => {
    const result = detectMention("hello @", 7);
    expect(result).not.toBeNull();
    expect(result?.query).toBe("");
    expect(result?.atIndex).toBe(6);
  });

  it("detects @agent query", () => {
    const result = detectMention("@agent", 6);
    expect(result).not.toBeNull();
    expect(result?.query).toBe("agent");
    expect(result?.atIndex).toBe(0);
  });

  it("detects partial handle mid-text", () => {
    const text = "ping @joh do this";
    // caret positioned after 'joh' (position 9)
    const result = detectMention(text, 9);
    expect(result).not.toBeNull();
    expect(result?.query).toBe("joh");
    expect(result?.atIndex).toBe(5);
  });

  it("returns null when @ is followed by a space (mention closed by space)", () => {
    const result = detectMention("hello @john ", 12);
    expect(result).toBeNull();
  });

  it("returns null when caret is before the @", () => {
    const result = detectMention("hello @john", 3);
    expect(result).toBeNull();
  });

  it("handles @ at the very start", () => {
    const result = detectMention("@ag", 3);
    expect(result).not.toBeNull();
    expect(result?.query).toBe("ag");
    expect(result?.atIndex).toBe(0);
  });

  it("picks the last @ before the caret in multi-@ text", () => {
    const text = "@alice and @bob";
    // "@alice and @bob": 0=@,1=a,2=l,3=i,4=c,5=e,6=sp,7=a,8=n,9=d,10=sp,11=@,12=b,13=o,14=b
    // caret at 14 → slice(0,14)="@alice and @bo" → query="bo", atIndex=11
    const result = detectMention(text, 14);
    expect(result).not.toBeNull();
    expect(result?.query).toBe("bo");
    expect(result?.atIndex).toBe(11);
  });
});

describe("insertMention", () => {
  it("replaces the @query at start with @handle+space", () => {
    const result = insertMention("@ag something", 0, "ag", "agent");
    expect(result).toBe("@agent something");
  });

  it("replaces mid-text @query", () => {
    const result = insertMention("ping @joh do this", 5, "joh", "john");
    expect(result).toBe("ping @john do this");
  });

  it("appends space after the handle (trailing cursor position)", () => {
    const result = insertMention("@", 0, "", "agent");
    expect(result).toBe("@agent ");
  });

  it("keeps text after the replaced query", () => {
    const result = insertMention("say @al hello", 4, "al", "alice");
    expect(result).toBe("say @alice hello");
  });
});

describe("filterMembers (inline)", () => {
  const members: ThreadMember[] = [
    { id: "agent", name: "Hermes Agent", handle: "agent", kind: "agent" },
    { id: "u1", name: "Alice Smith", handle: "alicesmith", kind: "user" },
    { id: "u2", name: "Bob Dana", handle: "bobdana", kind: "user" },
    { id: "u3", name: "Dana Lee", handle: "danalee", kind: "user" },
  ];

  function filterMembers(members: ThreadMember[], query: string): ThreadMember[] {
    if (!query) return members;
    const normalized = query.toLowerCase();
    return members.filter((m) => m.handle.toLowerCase().includes(normalized) || m.name.toLowerCase().includes(normalized));
  }

  it("returns all members for empty query", () => {
    expect(filterMembers(members, "")).toHaveLength(4);
  });

  it("filters by handle prefix", () => {
    const result = filterMembers(members, "alice");
    expect(result).toHaveLength(1);
    expect(result[0].handle).toBe("alicesmith");
  });

  it("filters by display name substring", () => {
    const result = filterMembers(members, "Dana");
    // matches 'Bob Dana' and 'Dana Lee'
    expect(result).toHaveLength(2);
  });

  it("matches @agent by handle", () => {
    const result = filterMembers(members, "agent");
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("agent");
  });

  it("is case-insensitive", () => {
    const result = filterMembers(members, "ALICE");
    expect(result).toHaveLength(1);
  });

  it("returns empty when no match", () => {
    expect(filterMembers(members, "zzz")).toHaveLength(0);
  });
});

describe("ThreadMember type shape", () => {
  it("agent sentinel has correct shape", () => {
    const member: ThreadMember = {
      id: "agent",
      name: "Hermes Agent",
      handle: "agent",
      kind: "agent",
    };
    expect(member.kind).toBe("agent");
    expect(member.handle).toBe("agent");
  });

  it("user member accepts optional fields", () => {
    const member: ThreadMember = {
      id: "u1",
      name: "Alice",
      handle: "alice",
      kind: "user",
      avatarUrl: null,
      roleLabel: "PO",
    };
    expect(member.avatarUrl).toBeNull();
    expect(member.roleLabel).toBe("PO");
  });
});
