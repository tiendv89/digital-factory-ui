import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ParsedFeature } from "../services/yaml-parser";

const mockData = vi.hoisted(() => {
  const features: ParsedFeature[] = [
    {
      id: "dashboard",
      title: "Dashboard",
      featureStatus: "in_implementation",
      tasks: [
        {
          id: "T4",
          title: "Merged task from main branch",
          status: "in_review",
          dependsOn: [],
          workspace_pr: {
            status: "closed",
            url: "https://example.com/workspace/pr/4",
          },
        },
      ],
    },
  ];

  const trackedFeatures: ParsedFeature[] = [
    {
      id: "authentication-system",
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
          pr: { status: "open", url: "https://example.com/pr/2" },
        },
        {
          id: "T3",
          title: "JWT verification",
          status: "in_review",
          dependsOn: ["T1", "T2"],
          pr: { status: "closed", url: "https://example.com/implementation/pr/3" },
          workspace_pr: {
            status: "open",
            url: "https://example.com/workspace/pr/3",
          },
        },
      ],
    },
  ];

  return { features, trackedFeatures };
});

vi.mock("../features/board/components/KanbanBoard/KanbanBoard.context", () => ({
  useBoardContext: () => ({
    features: mockData.features,
    trackedFeatures: mockData.trackedFeatures,
  }),
}));

import {
  TaskTrackingDetailPanel,
  TaskTrackingPanel,
} from "../features/board/components/TaskTrackingPanel";

describe("TaskTrackingPanel", () => {
  it("marks the selected status tab without depending on Kanban filters", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTrackingPanel, {
        selectedPanel: "ready",
        onSelectPanel: () => undefined,
      }),
    );

    expect(html).toContain("READY");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("border-l-primary");
  });
});

describe("TaskTrackingDetailPanel", () => {
  it("renders only the selected status detail content", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTrackingDetailPanel, {
        selectedPanel: "ready",
      }),
    );

    expect(html).toContain("Ready");
    expect(html).toContain("T2");
    expect(html).toContain("User registration API");
    expect(html).not.toContain("T1");
    expect(html).not.toContain("JWT verification");
  });

  it("renders no detail content for the Kanban board selection", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTrackingDetailPanel, {
        selectedPanel: "kanban_board",
      }),
    );

    expect(html).toBe("");
  });

  it("prefers workspace pull request metadata for tracked task details", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTrackingDetailPanel, {
        selectedPanel: "in_review",
      }),
    );

    expect(html).toContain('href="https://example.com/workspace/pr/3"');
    expect(html).toContain("open");
    expect(html).not.toContain("https://example.com/implementation/pr/3");
    expect(html).not.toContain("closed");
  });
});
