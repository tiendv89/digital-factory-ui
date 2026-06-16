import { describe, expect, it } from "vitest";

import { buildThreadEntries, parsePatch } from "@/components/tasks/task-review-view";
import type { TaskReviewThread } from "@/services/workflow-backend/types";

describe("parsePatch", () => {
  it("returns empty array for undefined input", () => {
    expect(parsePatch(undefined)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parsePatch("")).toEqual([]);
  });

  it("parses a simple add/remove/context patch", () => {
    const patch = `@@ -1,3 +1,4 @@
 import foo from "foo";
-const x = 1;
+const x = 2;
+const y = 3;
 export default x;`;
    const lines = parsePatch(patch);
    expect(lines).toEqual([
      { kind: "context", num: 1, text: 'import foo from "foo";' },
      { kind: "remove", num: 1, text: "const x = 1;" },
      { kind: "add", num: 2, text: "const x = 2;" },
      { kind: "add", num: 3, text: "const y = 3;" },
      { kind: "context", num: 4, text: "export default x;" },
    ]);
  });

  it("skips +++ and --- header lines", () => {
    const patch = `--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1,1 +1,1 @@
-old
+new`;
    const lines = parsePatch(patch);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual({ kind: "remove", num: 0, text: "old" });
    expect(lines[1]).toEqual({ kind: "add", num: 1, text: "new" });
  });

  it("handles multiple hunks with correct line numbers", () => {
    const patch = `@@ -1,2 +1,2 @@
 line1
-old
+new
@@ -10,2 +10,2 @@
 line10
-oldA
+newA`;
    const lines = parsePatch(patch);
    // context lines increment the new-file counter; remove lines use the current counter without incrementing
    expect(lines[0]).toEqual({ kind: "context", num: 1, text: "line1" });
    expect(lines[1]).toEqual({ kind: "remove", num: 1, text: "old" });
    expect(lines[2]).toEqual({ kind: "add", num: 2, text: "new" });
    expect(lines[3]).toEqual({ kind: "context", num: 10, text: "line10" });
    expect(lines[4]).toEqual({ kind: "remove", num: 10, text: "oldA" });
    expect(lines[5]).toEqual({ kind: "add", num: 11, text: "newA" });
  });

  it("only parses lines starting with +, -, or space", () => {
    const patch = `@@ -1 +1 @@
 context
+added
-removed
\\ No newline at end of file`;
    const lines = parsePatch(patch);
    expect(lines).toHaveLength(3);
    expect(lines.find((l) => l.text.includes("No newline"))).toBeUndefined();
  });
});

describe("buildThreadEntries", () => {
  it("returns empty array when both thread and log are absent", () => {
    expect(buildThreadEntries(null)).toEqual([]);
    expect(buildThreadEntries(null, [])).toEqual([]);
  });

  it("converts GitHub thread items to entries", () => {
    const thread: TaskReviewThread = {
      items: [
        {
          id: 1,
          kind: "review",
          author: "reviewer1",
          body: "LGTM",
          state: "APPROVED",
          created_at: "2026-01-01T01:00:00Z",
        },
        {
          id: 2,
          kind: "review_comment",
          author: "reviewer1",
          body: "nit",
          path: "src/foo.ts",
          line: 10,
          created_at: "2026-01-01T02:00:00Z",
        },
      ],
    };
    const entries = buildThreadEntries(thread);
    expect(entries).toHaveLength(2);
    expect(entries[0].id).toBe("github-review-1");
    expect(entries[0].kind).toBe("review");
    expect(entries[0].state).toBe("APPROVED");
    expect(entries[1].kind).toBe("review_comment");
    expect(entries[1].path).toBe("src/foo.ts");
    expect(entries[1].line).toBe(10);
  });

  it("converts reviewer_complete log entry to log_verdict", () => {
    const entries = buildThreadEntries(null, [
      {
        action: "reviewer_complete",
        by: "agent@example.com",
        at: "2026-01-01T03:00:00Z",
        note: "Review passed.",
      },
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].source).toBe("log");
    expect(entries[0].kind).toBe("log_verdict");
    expect(entries[0].author).toBe("agent@example.com");
    expect(entries[0].body).toBe("Review passed.");
  });

  it("converts review_blocked log entry to log_blocked", () => {
    const entries = buildThreadEntries(null, [
      {
        action: "review_blocked",
        by: "agent@example.com",
        at: "2026-01-01T03:00:00Z",
        note: "Max retries exceeded.",
      },
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe("log_blocked");
    expect(entries[0].body).toBe("Max retries exceeded.");
  });

  it("uses fallback body for review_blocked when note is absent", () => {
    const entries = buildThreadEntries(null, [
      {
        action: "review_blocked",
        by: "agent@example.com",
        at: "2026-01-01T00:00:00Z",
      },
    ]);
    expect(entries[0].body).toBe("Review incomplete.");
  });

  it("ignores log entries that are not reviewer_complete or review_blocked", () => {
    const entries = buildThreadEntries(null, [
      {
        action: "claimed",
        by: "agent@example.com",
        at: "2026-01-01T00:00:00Z",
      },
      {
        action: "started",
        by: "agent@example.com",
        at: "2026-01-01T00:01:00Z",
      },
      {
        action: "reviewer_complete",
        by: "agent@example.com",
        at: "2026-01-01T01:00:00Z",
        note: "Done.",
      },
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe("log_verdict");
  });

  it("merges and sorts by timestamp ascending", () => {
    const thread: TaskReviewThread = {
      items: [
        {
          id: 1,
          kind: "issue_comment",
          author: "human",
          body: "comment",
          created_at: "2026-01-01T03:00:00Z",
        },
        {
          id: 2,
          kind: "review",
          author: "agent",
          body: "verdict",
          state: "APPROVED",
          created_at: "2026-01-01T01:00:00Z",
        },
      ],
    };
    const log = [
      {
        action: "reviewer_complete",
        by: "agent@x.com",
        at: "2026-01-01T02:00:00Z",
        note: "Passed.",
      },
    ];
    const entries = buildThreadEntries(thread, log);
    expect(entries).toHaveLength(3);
    expect(entries[0].at).toBe("2026-01-01T01:00:00Z");
    expect(entries[1].at).toBe("2026-01-01T02:00:00Z");
    expect(entries[2].at).toBe("2026-01-01T03:00:00Z");
  });

  it("handles thread with empty items array", () => {
    const thread: TaskReviewThread = { items: [] };
    expect(buildThreadEntries(thread, [])).toEqual([]);
  });
});
