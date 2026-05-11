import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedFeature } from "../services/yaml-parser";
import {
  FeatureDetailSheet,
  FeatureDetailSheetMount,
} from "../features/board/components/FeatureDetailSheet";

const mockBoardContext = vi.hoisted(() => ({
  selectedFeature: null as ParsedFeature | null,
  setSelectedFeature: vi.fn(),
  workspace: {
    owner: "tiendv89",
    repo: "digital-factory-ui",
  },
}));

vi.mock("@/features/board/components/KanbanBoard", () => ({
  useBoardContext: () => mockBoardContext,
}));

const feature: ParsedFeature = {
  id: "feature-kanban-board",
  title: "Feature Kanban Board",
  featureStatus: "in_implementation",
  tasks: [
    {
      id: "T1",
      title: "Mode, status, and filter foundation",
      status: "done",
      dependsOn: [],
      description: "Create Google and GitHub OAuth app credentials",
      execution: {
        actor_type: "agent",
        last_updated_at: "2026-05-10T10:00:00Z",
      },
      pr: {
        status: "open",
        url: "https://example.com/repo/pr/1",
      },
      log: [
        { action: "done", by: "norepy@tiendv.dev", at: "2026-05-10T10:00:00Z" },
      ],
    },
    {
      id: "T3",
      title: "Feature detail sheet",
      status: "in_progress",
      dependsOn: ["T1"],
      description: "Add middleware to verify JWT in protected routes",
      execution: {
        actor_type: "agent",
        last_updated_at: "2026-05-10T14:00:00Z",
      },
      workspace_pr: {
        status: "open",
        url: "https://example.com/workspace/pr/3",
      },
      log: [
        {
          action: "started",
          by: "norepy@tiendv.dev",
          at: "2026-05-10T14:00:00Z",
        },
      ],
    },
  ],
};

const featureWithNoTasks: ParsedFeature = {
  id: "feature-empty",
  title: "Empty Feature",
  featureStatus: "in_design",
  tasks: [],
};

const featureWithUnknownStatus: ParsedFeature = {
  id: "feature-unknown",
  title: "Unknown Status Feature",
  featureStatus: "some_future_status",
  tasks: [],
};

beforeEach(() => {
  mockBoardContext.selectedFeature = null;
  mockBoardContext.setSelectedFeature.mockReset();
});

describe("FeatureDetailSheet — closed state", () => {
  it("renders without crashing when feature is null", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureDetailSheet, {
        feature: null,
        onClose: () => undefined,
      }),
    );
    expect(html).toBeTruthy();
    // Feature content is not rendered when closed
    expect(html).not.toContain("Feature Kanban Board");
    expect(html).not.toContain("feature-kanban-board");
  });

  it("sets aria-hidden when closed", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureDetailSheet, {
        feature: null,
        onClose: () => undefined,
      }),
    );
    expect(html).toContain('aria-hidden="true"');
  });
});

describe("FeatureDetailSheet — open state", () => {
  it("renders dialog role when feature is provided", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureDetailSheet, {
        feature,
        onClose: () => undefined,
      }),
    );
    expect(html).toContain('role="dialog"');
  });

  it("renders feature id", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureDetailSheet, {
        feature,
        onClose: () => undefined,
      }),
    );
    expect(html).toContain("feature-kanban-board");
  });

  it("renders feature title", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureDetailSheet, {
        feature,
        onClose: () => undefined,
      }),
    );
    expect(html).toContain("Feature Kanban Board");
  });

  it("renders feature status label", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureDetailSheet, {
        feature,
        onClose: () => undefined,
      }),
    );
    expect(html).toContain("In Progress");
  });

  it("renders last modified time when tasks have timestamps", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureDetailSheet, {
        feature,
        onClose: () => undefined,
      }),
    );
    // formatTimestamp formats to "May 10 14:00"
    expect(html).toContain("May");
  });

  it("renders None for last modified when no tasks have timestamps", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureDetailSheet, {
        feature: featureWithNoTasks,
        onClose: () => undefined,
      }),
    );
    expect(html).toContain("None");
  });

  it("renders a close button", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureDetailSheet, {
        feature,
        onClose: () => undefined,
      }),
    );
    expect(html).toContain("Close");
  });

  it("includes accessible overlay button", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureDetailSheet, {
        feature,
        onClose: () => undefined,
      }),
    );
    expect(html).toContain("Close feature detail");
  });

  it("renders the task section with stacked task cards", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureDetailSheet, {
        feature,
        onClose: () => undefined,
      }),
    );
    expect(html).toContain("Tasks");
    expect(html.match(/data-feature-task-card/g) ?? []).toHaveLength(2);
    expect(html).toContain("T1");
    expect(html).toContain("Mode, status, and filter foundation");
    expect(html).toContain("Feature detail sheet");
  });

  it("renders task metadata and action text like the reference detail panel", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureDetailSheet, {
        feature,
        onClose: () => undefined,
      }),
    );
    expect(html).toContain("No branch");
    expect(html).toContain("Repository PR");
    expect(html).toContain("https://example.com/repo/pr/1");
    expect(html).toContain("https://example.com/workspace/pr/3");
    expect(html).toContain("Create Google and GitHub OAuth app credentials");
    expect(html).toContain("Add middleware to verify JWT in protected routes");
    expect(html).toContain("bg-warning-bg");
    expect(html).toContain("bg-success-bg");
  });

  it("renders the activity timeline sorted by newest log first", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureDetailSheet, {
        feature,
        onClose: () => undefined,
      }),
    );
    expect(html).toContain("Activity Timeline");
    expect(html.match(/data-feature-timeline-entry/g) ?? []).toHaveLength(2);

    const newerTaskIndex = html.indexOf('data-feature-timeline-task="T3"');
    const olderTaskIndex = html.indexOf('data-feature-timeline-task="T1"');
    expect(newerTaskIndex).toBeGreaterThan(-1);
    expect(olderTaskIndex).toBeGreaterThan(-1);
    expect(newerTaskIndex).toBeLessThan(olderTaskIndex);
    expect(html).toContain("started");
    expect(html).toContain("by norepy@tiendv.dev");
    expect(html).toContain("border border-border");
    expect(html).toContain("bg-warning-bg");
  });

  it("renders the activity timeline empty state when no task logs exist", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureDetailSheet, {
        feature: featureWithNoTasks,
        onClose: () => undefined,
      }),
    );
    expect(html).toContain("Activity Timeline");
    expect(html).toContain("No activity logs available.");
  });
});

describe("FeatureDetailSheet — unknown status", () => {
  it("renders without crashing for unknown feature status", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureDetailSheet, {
        feature: featureWithUnknownStatus,
        onClose: () => undefined,
      }),
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain("feature-unknown");
    expect(html).toContain("Unknown Status Feature");
  });

  it("falls back to raw status string for unknown status", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeatureDetailSheet, {
        feature: featureWithUnknownStatus,
        onClose: () => undefined,
      }),
    );
    // getFeatureStatusLabel returns the raw value when unknown
    expect(html).toContain("some_future_status");
  });
});

describe("FeatureDetailSheetMount", () => {
  it("renders no feature content when selectedFeature is null", () => {
    mockBoardContext.selectedFeature = null;
    const html = renderToStaticMarkup(
      React.createElement(FeatureDetailSheetMount),
    );
    // Feature content should not be rendered when closed
    expect(html).not.toContain("Feature Kanban Board");
    expect(html).not.toContain("feature-kanban-board");
  });

  it("renders dialog when selectedFeature is set in context", () => {
    mockBoardContext.selectedFeature = feature;
    const html = renderToStaticMarkup(
      React.createElement(FeatureDetailSheetMount),
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain("Feature Kanban Board");
    expect(html).toContain("feature-kanban-board");
  });

  it("does not call setSelectedFeature on render", () => {
    mockBoardContext.selectedFeature = feature;
    renderToStaticMarkup(React.createElement(FeatureDetailSheetMount));
    expect(mockBoardContext.setSelectedFeature).not.toHaveBeenCalled();
  });
});
