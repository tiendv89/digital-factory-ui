import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ParsedFeature } from "../services/yaml-parser";
import {
  STATUS_COLUMNS,
  getStatusColor,
  getNextAction,
  getFeatureStatusColor,
  getFeatureStatusLabel,
} from "../features/board/lib/status";
import { FeatureRow } from "../features/board/components/FeatureRow";
import { TaskCard } from "../features/board/components/TaskCard";

describe("STATUS_COLUMNS", () => {
  it("defines exactly 7 columns", () => {
    expect(STATUS_COLUMNS).toHaveLength(7);
  });

  it("contains the canonical task statuses in order", () => {
    const keys = STATUS_COLUMNS.map((c) => c.key);
    expect(keys).toEqual([
      "todo",
      "ready",
      "in_progress",
      "blocked",
      "in_review",
      "done",
      "cancelled",
    ]);
  });

  it("every column has a non-empty label and valid hex color", () => {
    for (const col of STATUS_COLUMNS) {
      expect(col.label).toBeTruthy();
      expect(col.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("uses color squares instead of icon metadata for column headers", () => {
    for (const col of STATUS_COLUMNS) {
      expect("iconName" in col).toBe(false);
    }
  });
});

describe("getStatusColor", () => {
  it("returns the colour for known statuses", () => {
    expect(getStatusColor("todo")).toBe("#3274b4");
    expect(getStatusColor("ready")).toBe("#6e6de7");
    expect(getStatusColor("in_progress")).toBe("#e08500");
    expect(getStatusColor("blocked")).toBe("#e62a34");
    expect(getStatusColor("in_review")).toBe("#8e67cb");
    expect(getStatusColor("done")).toBe("#009252");
    expect(getStatusColor("cancelled")).toBe("#5c636e");
  });

  it("returns a fallback colour for unknown statuses", () => {
    const color = getStatusColor("unknown_status");
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe("getNextAction", () => {
  it("returns an action string for statuses that have a next action", () => {
    const statuses = [
      "todo",
      "ready",
      "in_progress",
      "blocked",
      "in_review",
      "cancelled",
    ];
    for (const status of statuses) {
      expect(getNextAction(status)).toBeTruthy();
    }
    expect(getNextAction("done")).toBe("");
  });

  it("returns empty string for unknown status", () => {
    expect(getNextAction("unknown_xyz")).toBe("");
  });

  it("maps status → workflow transition label from the task status diagram", () => {
    expect(getNextAction("todo")).toBe("Auto-ready when last dependency is done");
    expect(getNextAction("ready")).toBe("Start implementation");
    expect(getNextAction("in_progress")).toBe("Waiting for result");
    expect(getNextAction("blocked")).toBe("Human resolves");
    expect(getNextAction("in_review")).toBe("Human approves or rejects");
    expect(getNextAction("done")).toBe("");
    expect(getNextAction("cancelled")).toBe("Do nothing");
  });
});

describe("getFeatureStatusColor", () => {
  it("returns a valid hex color for known feature statuses", () => {
    const statuses = [
      "in_design",
      "in_tdd",
      "ready_for_implementation",
      "in_implementation",
      "in_handoff",
      "done",
      "blocked",
      "cancelled",
    ];
    for (const status of statuses) {
      expect(getFeatureStatusColor(status)).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("returns a fallback for unknown statuses", () => {
    expect(getFeatureStatusColor("some_future_status")).toMatch(
      /^#[0-9a-fA-F]{6}$/,
    );
  });
});

describe("getFeatureStatusLabel", () => {
  it("returns human-readable label for known feature statuses", () => {
    expect(getFeatureStatusLabel("in_implementation")).toBe("In Progress");
    expect(getFeatureStatusLabel("ready_for_implementation")).toBe("Ready");
    expect(getFeatureStatusLabel("in_handoff")).toBe("Handoff");
    expect(getFeatureStatusLabel("done")).toBe("Done");
  });

  it("returns 'Unknown' for unrecognized statuses", () => {
    expect(getFeatureStatusLabel("some_unknown_state")).toBe("Unknown");
  });
});

describe("FeatureRow task grid", () => {
  it("renders expanded tasks as one task row with one status cell per row", () => {
    const feature: ParsedFeature = {
      id: "auth-system",
      title: "Authentication System",
      featureStatus: "in_implementation",
      tasks: [
        {
          id: "T1",
          title: "Setup OAuth providers",
          status: "todo",
          dependsOn: [],
        },
        {
          id: "T2",
          title: "User registration API",
          status: "ready",
          dependsOn: [],
        },
      ],
    };

    const html = renderToStaticMarkup(
      React.createElement(FeatureRow, {
        feature,
        isExpanded: true,
        onToggle: () => undefined,
        onOpenTaskTab: () => undefined,
      }),
    );

    expect(html.match(/data-task-grid-row/g) ?? []).toHaveLength(2);
    expect(html.match(/data-status-cell/g) ?? []).toHaveLength(
      feature.tasks.length * STATUS_COLUMNS.length,
    );
    expect(html).toContain('data-task-id="T1"');
    expect(html).toContain('data-task-id="T2"');
  });

  it("renders one segment per task with per-task tooltips", () => {
    const feature: ParsedFeature = {
      id: "auth-system",
      title: "Authentication System",
      featureStatus: "in_implementation",
      tasks: [
        {
          id: "T1",
          title: "Setup OAuth providers",
          status: "todo",
          dependsOn: [],
        },
        {
          id: "T2",
          title: "User registration API",
          status: "ready",
          dependsOn: [],
        },
        {
          id: "T3",
          title: "JWT verification",
          status: "in_review",
          dependsOn: ["T1", "T2"],
        },
        {
          id: "T4",
          title: "Login UI components",
          status: "in_review",
          dependsOn: ["T3"],
        },
      ],
    };

    const html = renderToStaticMarkup(
      React.createElement(FeatureRow, {
        feature,
        isExpanded: false,
        onToggle: () => undefined,
        onOpenTaskTab: () => undefined,
      }),
    );

    expect(html).toContain("data-progress-tooltip");
    expect(html.match(/data-progress-segment/g) ?? []).toHaveLength(4);
    expect(html).toContain("T1: Todo");
    expect(html).toContain("T2: Ready");
    expect(html).toContain("T3: In Review");
    expect(html).toContain("T4: In Review");
    expect(html).not.toContain("blocked: 0");
    expect(html).not.toContain("done: 0");
  });

  it("renders the feature last modified timestamp when task timestamps exist", () => {
    const feature: ParsedFeature = {
      id: "auth-system",
      title: "Authentication System",
      featureStatus: "in_implementation",
      tasks: [
        {
          id: "T1",
          title: "Setup OAuth providers",
          status: "todo",
          dependsOn: [],
          log: [
            {
              action: "created",
              by: "agent",
              at: "2026-05-05T09:30:00Z",
            },
          ],
        },
      ],
    };

    const html = renderToStaticMarkup(
      React.createElement(FeatureRow, {
        feature,
        isExpanded: false,
        onToggle: () => undefined,
        onOpenTaskTab: () => undefined,
      }),
    );

    expect(html).toContain("Modified");
    expect(html).toContain("May 5");
    expect(html).toContain("data-feature-modified-at");
    expect(html).toContain("text-text-muted");
    expect(html).toContain('data-modified-today="false"');
  });

  it("highlights the feature timestamp when it was modified today", () => {
    const feature: ParsedFeature = {
      id: "auth-system",
      title: "Authentication System",
      featureStatus: "in_implementation",
      tasks: [
        {
          id: "T1",
          title: "Setup OAuth providers",
          status: "todo",
          dependsOn: [],
          log: [
            {
              action: "created",
              by: "agent",
              at: new Date().toISOString(),
            },
          ],
        },
      ],
    };

    const html = renderToStaticMarkup(
      React.createElement(FeatureRow, {
        feature,
        isExpanded: false,
        onToggle: () => undefined,
        onOpenTaskTab: () => undefined,
      }),
    );

    expect(html).toContain('data-modified-today="true"');
    expect(html).toContain("bg-success-bg");
    expect(html).toContain("text-success");
  });
});

describe("FeatureRow feature label", () => {
  it("renders feature.id as the primary label, not feature.title", () => {
    const feature: ParsedFeature = {
      id: "auth-system",
      title: "Authentication System",
      featureStatus: "in_implementation",
      tasks: [],
    };

    const html = renderToStaticMarkup(
      React.createElement(FeatureRow, {
        feature,
        isExpanded: false,
        onToggle: () => undefined,
        onOpenTaskTab: () => undefined,
      }),
    );

    expect(html).toContain("auth-system");
    expect(html).not.toContain("Authentication System");
  });

  it("keeps long feature ids truncatable", () => {
    const feature: ParsedFeature = {
      id: "ui-interaction-updates-with-a-very-long-feature-id",
      title: "UI Interaction Updates",
      featureStatus: "in_implementation",
      tasks: [],
    };

    const html = renderToStaticMarkup(
      React.createElement(FeatureRow, {
        feature,
        isExpanded: false,
        onToggle: () => undefined,
        onOpenTaskTab: () => undefined,
      }),
    );

    expect(html).toContain(feature.id);
    expect(html).toContain(`title="${feature.id}"`);
    expect(html).toContain(
      'class="min-w-0 truncate text-sm font-semibold uppercase text-text-primary"',
    );
    expect(html).not.toContain("UI Interaction Updates");
  });
});

describe("FeatureRow segment bar equal-width", () => {
  it("renders rounded separated segments with flex-1 for equal widths", () => {
    const feature: ParsedFeature = {
      id: "auth-system",
      title: "Authentication System",
      featureStatus: "in_implementation",
      tasks: [
        { id: "T1", title: "Task one", status: "done", dependsOn: [] },
        { id: "T2", title: "Task two", status: "done", dependsOn: [] },
        { id: "T3", title: "Task three", status: "in_progress", dependsOn: [] },
      ],
    };

    const html = renderToStaticMarkup(
      React.createElement(FeatureRow, {
        feature,
        isExpanded: false,
        onToggle: () => undefined,
        onOpenTaskTab: () => undefined,
      }),
    );

    expect(html.match(/data-progress-segment/g) ?? []).toHaveLength(3);
    expect(html).toContain("T1: Done");
    expect(html).toContain("T2: Done");
    expect(html).toContain("T3: In Progress");
    expect(html).toContain("gap-0.5");
    expect(html).toContain("flex-1");
    expect(html).toContain("rounded-full");
  });

  it("renders empty bar when feature has no tasks", () => {
    const feature: ParsedFeature = {
      id: "empty-feature",
      title: "",
      featureStatus: "in_design",
      tasks: [],
    };

    const html = renderToStaticMarkup(
      React.createElement(FeatureRow, {
        feature,
        isExpanded: false,
        onToggle: () => undefined,
        onOpenTaskTab: () => undefined,
      }),
    );

    expect(html.match(/data-progress-segment/g) ?? []).toHaveLength(0);
    expect(html).toContain("e4e7ef");
    expect(html).toContain("rounded-full");
  });
});

describe("TaskCard", () => {
  it("does not render an actor badge icon", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskCard, {
        featureId: "auth-system",
        featureTitle: "Authentication System",
        onOpenTab: () => undefined,
        task: {
          id: "T3",
          title: "JWT verification",
          status: "in_progress",
          dependsOn: [],
          execution: { actor_type: "agent" },
        },
      }),
    );

    expect(html).not.toContain("Executed by agent");
    expect(html).not.toContain("lucide-bot");
  });
});
