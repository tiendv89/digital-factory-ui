// @vitest-environment jsdom
/**
 * T7 subtask 6 — Cross-browser status-age indicator rendering and styles
 * T7 subtask 7 — Dynamic log-transition status-age update
 *
 * Uses @testing-library/react with jsdom to verify:
 *   - Status-age badge renders with correct aria-label, text, and CSS classes
 *   - Status-age badge is hidden when no timestamp is available
 *   - Status-age badge renders consistently across statuses (blocked, in_progress,
 *     in_review, ready, in_reviewing)
 *   - Status-age badge re-calculates on dynamic prop updates (new log entries)
 */

import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ParsedFeature, ParsedTask } from "../services/yaml-parser";

// ─── Imports (real component, real helpers) ──────────────────────────────────

import { TaskTrackingItem } from "../features/board/components/TaskTrackingPanel/TaskTrackingItem";

// ─── Fixture factories ───────────────────────────────────────────────────────

function makeTask(
  id: string,
  status: string,
  overrides: Partial<ParsedTask> = {},
): ParsedTask {
  return {
    id,
    title: `Task ${id}`,
    status,
    dependsOn: [],
    ...overrides,
  };
}

function makeFeature(
  id: string,
  overrides: Partial<ParsedFeature> = {},
): ParsedFeature {
  return {
    id,
    title: `Feature ${id}`,
    featureStatus: "in_implementation",
    tasks: [],
    ...overrides,
  };
}

function onSelect() {
  /* noop */
}

// ─── Assertion helpers ───────────────────────────────────────────────────────

const STATUS_AGE_CLASSES = [
  "border-border",
  "bg-surface",
  "px-1.5",
  "font-mono",
  "font-bold",
  "text-text-primary",
] as const;

function assertStatusAgeClasses(el: HTMLElement) {
  for (const cls of STATUS_AGE_CLASSES) {
    expect(
      el.className,
      `Missing class "${cls}" on status-age element`,
    ).toContain(cls);
  }
}

function assertStatusAgePresent(label: string, text: string) {
  const el = screen.getByLabelText(label);
  expect(el).toBeTruthy();
  expect(el.tagName).toBe("SPAN");
  expect(el.textContent).toBe(text);
  assertStatusAgeClasses(el);
  return el;
}

function assertStatusAgeHidden() {
  const els = screen.queryAllByLabelText(/^Status age:/);
  expect(els).toHaveLength(0);
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
});

// ═══════════════════════════════════════════════════════════════════════════════
// T7 subtask 6 — Status-age indicator rendering and styles
// ═══════════════════════════════════════════════════════════════════════════════

describe("T7 subtask 6 — Status-age badge renders correctly via @testing-library/react", () => {
  // ── 6a: Happy path — renders badge with correct text and classes ───────────

  it("renders status-age badge with correct aria-label, text content, and CSS classes for in_progress", () => {
    const task = makeTask("T1", "in_progress", {
      log: [
        {
          action: "started",
          by: "u@e.com",
          at: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
        },
      ],
    });

    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );

    assertStatusAgePresent("Status age: 2h", "2h");
  });

  it("renders status-age badge for blocked status", () => {
    const task = makeTask("T2", "blocked", {
      log: [
        {
          action: "blocked",
          by: "u@e.com",
          at: new Date(Date.now() - 30 * 60_000).toISOString(),
        },
      ],
    });

    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );

    assertStatusAgePresent("Status age: 30m", "30m");
  });

  it("renders status-age badge for in_review status", () => {
    const task = makeTask("T3", "in_review", {
      log: [
        {
          action: "in_review",
          by: "u@e.com",
          at: new Date(
            Date.now() - 3 * 24 * 60 * 60_000,
          ).toISOString(),
        },
      ],
    });

    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );

    assertStatusAgePresent("Status age: 3d", "3d");
  });

  it("renders status-age badge for ready status using the ready log action", () => {
    const task = makeTask("T4", "ready", {
      log: [
        {
          action: "ready",
          by: "u@e.com",
          at: new Date(Date.now() - 45 * 1000).toISOString(),
        },
      ],
    });

    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );

    assertStatusAgePresent("Status age: 45s", "45s");
  });

  // ── 6b: Badge hidden when no timestamp available ───────────────────────────

  it("does not render status-age badge when no timestamp is available", () => {
    const task = makeTask("T5", "ready");

    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );

    assertStatusAgeHidden();
  });

  it("does not render status-age badge when all timestamps are invalid", () => {
    const task = makeTask("T6", "in_progress", {
      log: [{ action: "started", by: "u@e.com", at: "not-a-date" }],
    });

    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );

    assertStatusAgeHidden();
  });

  // ── 6c: in_reviewing status — falls back to last log or execution ─────────

  it("renders status-age badge for in_reviewing using last log fallback", () => {
    const task = makeTask("T7", "in_reviewing", {
      log: [
        {
          action: "started",
          by: "u@e.com",
          at: new Date(Date.now() - 5 * 60_000).toISOString(),
        },
      ],
    });

    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );

    assertStatusAgePresent("Status age: 5m", "5m");
  });

  it("renders status-age badge for in_reviewing using execution.last_updated_at fallback", () => {
    const task = makeTask("T8", "in_reviewing", {
      execution: {
        actor_type: "agent",
        last_updated_at: new Date(
          Date.now() - 60 * 60_000,
        ).toISOString(),
      },
    });

    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );

    assertStatusAgePresent("Status age: 1h", "1h");
  });

  // ── 6d: Milliseconds / edge time values ────────────────────────────────────

  it("renders '0s' for sub-second elapsed", () => {
    const task = makeTask("T9", "in_progress", {
      log: [
        {
          action: "started",
          by: "u@e.com",
          at: new Date(Date.now() - 500).toISOString(),
        },
      ],
    });

    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );

    assertStatusAgePresent("Status age: 0s", "0s");
  });

  it("renders '59s' boundary — still in seconds range", () => {
    const task = makeTask("T10", "in_progress", {
      log: [
        {
          action: "started",
          by: "u@e.com",
          at: new Date(Date.now() - 59_000).toISOString(),
        },
      ],
    });

    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );

    assertStatusAgePresent("Status age: 59s", "59s");
  });

  it("renders '59m' boundary — still in minutes range", () => {
    const task = makeTask("T11", "in_progress", {
      log: [
        {
          action: "started",
          by: "u@e.com",
          at: new Date(Date.now() - 59 * 60_000).toISOString(),
        },
      ],
    });

    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );

    assertStatusAgePresent("Status age: 59m", "59m");
  });

  it("renders '23h' boundary — still in hours range", () => {
    const task = makeTask("T12", "in_progress", {
      log: [
        {
          action: "started",
          by: "u@e.com",
          at: new Date(
            Date.now() - 23 * 60 * 60_000,
          ).toISOString(),
        },
      ],
    });

    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );

    assertStatusAgePresent("Status age: 23h", "23h");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T7 subtask 7 — Dynamic log-transition status-age update
// ═══════════════════════════════════════════════════════════════════════════════

describe("T7 subtask 7 — Status-age dynamically re-calculates on log/prop changes", () => {
  it("recalculates status age when a new log entry is added (dynamic update)", () => {
    // Initial task — status age based on 2h ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
    const task = makeTask("T1", "in_progress", {
      log: [{ action: "started", by: "u@e.com", at: twoHoursAgo }],
    });

    const feature = makeFeature("auth");

    const { rerender } = render(
      React.createElement(TaskTrackingItem, { task, feature, onSelect }),
    );

    // Initial: 2h
    assertStatusAgePresent("Status age: 2h", "2h");

    // Simulate a new log transition: task moves to in_review
    const now = new Date(Date.now() - 10 * 60_000).toISOString();
    const updatedTask: ParsedTask = {
      ...task,
      status: "in_review",
      log: [...task.log!, { action: "in_review", by: "u@e.com", at: now }],
    };

    rerender(
      React.createElement(TaskTrackingItem, {
        task: updatedTask,
        feature,
        onSelect,
      }),
    );

    // Updated: 10m (based on the new in_review transition)
    assertStatusAgePresent("Status age: 10m", "10m");
  });

  it("recalculates status age when a task transitions from ready to in_progress", () => {
    const readyTime = new Date(Date.now() - 6 * 60 * 60_000).toISOString();
    const task = makeTask("T2", "ready", {
      log: [{ action: "ready", by: "u@e.com", at: readyTime }],
    });

    const { rerender } = render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );

    // Initial: 6h
    assertStatusAgePresent("Status age: 6h", "6h");

    // Task gets claimed
    const claimedTime = new Date(Date.now() - 30 * 60_000).toISOString();
    const updated: ParsedTask = {
      ...task,
      status: "in_progress",
      log: [...task.log!, { action: "claimed", by: "agent", at: claimedTime }],
    };

    rerender(
      React.createElement(TaskTrackingItem, {
        task: updated,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );

    // Updated: 30m
    assertStatusAgePresent("Status age: 30m", "30m");
  });

  it("recalculates status age when a task becomes blocked mid-workflow", () => {
    const startedTime = new Date(Date.now() - 4 * 60 * 60_000).toISOString();
    const task = makeTask("T3", "in_progress", {
      log: [{ action: "started", by: "u@e.com", at: startedTime }],
    });

    const { rerender } = render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );

    // Initial: 4h
    assertStatusAgePresent("Status age: 4h", "4h");

    // Task gets blocked
    const blockedTime = new Date(Date.now() - 45 * 60_000).toISOString();
    const updated: ParsedTask = {
      ...task,
      status: "blocked",
      blockedReason: "Dependency T4 not ready",
      log: [
        ...task.log!,
        { action: "blocked", by: "u@e.com", at: blockedTime },
      ],
    };

    rerender(
      React.createElement(TaskTrackingItem, {
        task: updated,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );

    // Updated: 45m
    assertStatusAgePresent("Status age: 45m", "45m");
  });

  it("shows status age when log is added to a task that previously had none", () => {
    // Task with no log — status age hidden
    const task = makeTask("T4", "in_progress");

    const { rerender } = render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );

    // Initial: no status age (no timestamp)
    assertStatusAgeHidden();

    // Log entry is added
    const claimedTime = new Date(Date.now() - 15 * 60_000).toISOString();
    const updated: ParsedTask = {
      ...task,
      log: [{ action: "started", by: "agent", at: claimedTime }],
    };

    rerender(
      React.createElement(TaskTrackingItem, {
        task: updated,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );

    // Now a status age badge appears
    assertStatusAgePresent("Status age: 15m", "15m");
  });

  it("status age disappears when timestamps are removed from a task", () => {
    const task = makeTask("T5", "ready", {
      log: [
        {
          action: "ready",
          by: "u@e.com",
          at: new Date(Date.now() - 1 * 60 * 60_000).toISOString(),
        },
      ],
    });

    const { rerender } = render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );

    // Initial: badge present
    assertStatusAgePresent("Status age: 1h", "1h");

    // Timestamps cleared — badge should disappear
    const updated: ParsedTask = {
      ...task,
      log: [],
      execution: undefined,
    };

    rerender(
      React.createElement(TaskTrackingItem, {
        task: updated,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );

    assertStatusAgeHidden();
  });
});
