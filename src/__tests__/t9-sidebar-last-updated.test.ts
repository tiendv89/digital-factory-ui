// @vitest-environment jsdom
/**
 * T9 — Sidebar task last-updated timestamps
 *
 * Uses @testing-library/react with jsdom to verify:
 *   - Last-updated label renders with correct aria-label, text, and styles
 *   - Label appears for all five tracked statuses (blocked, in_progress,
 *     reviewing, in_review, ready)
 *   - Label is omitted when execution or last_updated_at is missing
 *   - Label is omitted for invalid timestamps
 *   - Existing click behavior and status age label are preserved
 */

import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ParsedFeature, ParsedTask } from "../services/yaml-parser";

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

const LAST_UPDATED_CLASSES = [
  "border-primary-light",
  "bg-primary-light",
  "px-1.5",
  "font-mono",
  "font-semibold",
  "text-primary",
] as const;

function assertLastUpdatedPresent(expectedLabel: string) {
  const ariaLabel = `Last updated: ${expectedLabel}`;
  const el = screen.getByLabelText(ariaLabel);
  expect(el).toBeTruthy();
  expect(el.tagName).toBe("SPAN");
  expect(el.textContent).toBe(expectedLabel);
  for (const cls of LAST_UPDATED_CLASSES) {
    expect(
      el.className,
      `Missing class "${cls}" on last-updated element`,
    ).toContain(cls);
  }
  return el;
}

function assertLastUpdatedMissing() {
  const els = screen.queryAllByLabelText(/^Last updated:/);
  expect(els).toHaveLength(0);
}

function assertStatusAgePresent(label: string, text: string) {
  const el = screen.getByLabelText(label);
  expect(el).toBeTruthy();
  expect(el.textContent).toBe(text);
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
});

// ═══════════════════════════════════════════════════════════════════════════════
// T9 — Last-updated label renders across all five tracked statuses
// ═══════════════════════════════════════════════════════════════════════════════

describe("T9 — Last-updated label renders for each tracked status", () => {
  const timestamp = new Date(Date.now() - 2 * 60 * 60_000).toISOString();

  it("renders last-updated label for blocked tasks", () => {
    const task = makeTask("T1", "blocked", {
      execution: { actor_type: "agent", last_updated_at: timestamp },
    });
    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );
    assertLastUpdatedPresent("2h ago");
  });

  it("renders last-updated label for in_progress tasks", () => {
    const task = makeTask("T2", "in_progress", {
      execution: { actor_type: "agent", last_updated_at: timestamp },
    });
    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );
    assertLastUpdatedPresent("2h ago");
  });

  it("renders last-updated label for reviewing tasks", () => {
    const task = makeTask("T3", "reviewing", {
      execution: { actor_type: "agent", last_updated_at: timestamp },
    });
    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );
    assertLastUpdatedPresent("2h ago");
  });

  it("renders last-updated label for in_review tasks", () => {
    const task = makeTask("T4", "in_review", {
      execution: { actor_type: "agent", last_updated_at: timestamp },
    });
    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );
    assertLastUpdatedPresent("2h ago");
  });

  it("renders last-updated label for ready tasks", () => {
    const task = makeTask("T5", "ready", {
      execution: { actor_type: "agent", last_updated_at: timestamp },
    });
    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );
    assertLastUpdatedPresent("2h ago");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T9 — Missing / invalid timestamps omit the label
// ═══════════════════════════════════════════════════════════════════════════════

describe("T9 — Last-updated label omitted for missing or invalid timestamps", () => {
  it("omits label when execution is missing", () => {
    const task = makeTask("T1", "in_progress");
    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );
    assertLastUpdatedMissing();
  });

  it("omits label when execution has no last_updated_at", () => {
    const task = makeTask("T2", "in_progress", {
      execution: { actor_type: "agent" },
    });
    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );
    assertLastUpdatedMissing();
  });

  it("omits label for invalid ISO timestamp", () => {
    const task = makeTask("T3", "in_progress", {
      execution: { actor_type: "agent", last_updated_at: "not-a-date" },
    });
    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );
    assertLastUpdatedMissing();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T9 — Existing behavior is preserved
// ═══════════════════════════════════════════════════════════════════════════════

describe("T9 — Existing task card behavior is preserved", () => {
  it("preserves status age label when both status age and last-updated are available", () => {
    const task = makeTask("T1", "in_progress", {
      log: [
        {
          action: "started",
          by: "u@e.com",
          at: new Date(Date.now() - 30 * 60_000).toISOString(),
        },
      ],
      execution: {
        actor_type: "agent",
        last_updated_at: new Date(Date.now() - 10 * 60_000).toISOString(),
      },
    });
    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );
    assertStatusAgePresent("Status age: 30m", "30m");
    assertLastUpdatedPresent("10m ago");
  });

  it("renders a focusable button with task title and feature name", () => {
    const task = makeTask("T1", "in_progress", {
      execution: {
        actor_type: "agent",
        last_updated_at: new Date(Date.now() - 10 * 60_000).toISOString(),
      },
    });
    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth-f"),
        onSelect,
      }),
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeTruthy();
    expect(screen.getByLabelText("Task T1")).toBeTruthy();
    expect(screen.getByText("Task T1")).toBeTruthy();
    // The feature title may be rendered inside a truncated span; use a substring check.
    expect(btn.textContent).toContain("auth-f");
    assertLastUpdatedPresent("10m ago");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T9 — Seconds, minutes, hours, days format boundaries
// ═══════════════════════════════════════════════════════════════════════════════

describe("T9 — Last-updated label format boundaries", () => {
  it("renders seconds label for recent update", () => {
    const task = makeTask("T1", "in_progress", {
      execution: {
        actor_type: "agent",
        last_updated_at: new Date(Date.now() - 45_000).toISOString(),
      },
    });
    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );
    assertLastUpdatedPresent("45s ago");
  });

  it("renders minutes label for sub-hour elapsed", () => {
    const task = makeTask("T1", "in_progress", {
      execution: {
        actor_type: "agent",
        last_updated_at: new Date(Date.now() - 15 * 60_000).toISOString(),
      },
    });
    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );
    assertLastUpdatedPresent("15m ago");
  });

  it("renders hours label for sub-day elapsed", () => {
    const task = makeTask("T1", "in_progress", {
      execution: {
        actor_type: "agent",
        last_updated_at: new Date(Date.now() - 5 * 60 * 60_000).toISOString(),
      },
    });
    render(
      React.createElement(TaskTrackingItem, {
        task,
        feature: makeFeature("auth"),
        onSelect,
      }),
    );
    assertLastUpdatedPresent("5h ago");
  });

  it("renders days label for >= 24 hours elapsed", () => {
    const task = makeTask("T1", "in_progress", {
      execution: {
        actor_type: "agent",
        last_updated_at: new Date(
          Date.now() - 2 * 24 * 60 * 60_000,
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
    assertLastUpdatedPresent("2d ago");
  });
});
