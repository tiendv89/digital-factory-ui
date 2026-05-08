import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ParsedFeature } from "../services/yaml-parser";

const mockSetSelectedTask = vi.fn();

const mockData = vi.hoisted(() => {
  const features: ParsedFeature[] = [
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
        },
        {
          id: "T3",
          title: "JWT verification",
          status: "in_review",
          dependsOn: ["T1", "T2"],
        },
        {
          id: "T4",
          title: "Token refresh flow",
          status: "in_progress",
          dependsOn: [],
          execution: { actor_type: "agent" },
        },
      ],
    },
    {
      id: "empty-feature",
      title: "Empty Feature",
      featureStatus: "in_implementation",
      tasks: [
        { id: "T5", title: "Orphaned task", status: "done", dependsOn: [] },
      ],
    },
  ];

  return { features };
});

vi.mock("../features/board/components/KanbanBoard/KanbanBoard.context", () => ({
  useBoardContext: () => ({
    features: mockData.features,
    trackedFeatures: [],
    setSelectedTask: mockSetSelectedTask,
    searchQuery: "",
    activeFilters: { statuses: [] },
  }),
}));

import { TaskTrackingPanel } from "../features/board/components/TaskTrackingPanel";
import { TaskTrackingSection } from "../features/board/components/TaskTrackingPanel/TaskTrackingSection";
import { groupTrackedTasks } from "../features/board/components/TaskTrackingPanel/groupTasks";

describe("TaskTrackingPanel — companion panel", () => {
  it("renders the sidebar header with title and description", () => {
    const html = renderToStaticMarkup(React.createElement(TaskTrackingPanel));
    expect(html).toContain("Tasks Sidebar");
    expect(html).toContain("Expand each status to view tasks directly in the sidebar");
  });

  it("renders all 3 status sections", () => {
    const html = renderToStaticMarkup(React.createElement(TaskTrackingPanel));
    expect(html).toContain("IN PROGRESS");
    expect(html).toContain("IN REVIEW");
    expect(html).toContain("READY");
  });

  it("renders sections in product order: IN PROGRESS, IN REVIEW, READY", () => {
    const html = renderToStaticMarkup(React.createElement(TaskTrackingPanel));
    const inProgressIdx = html.indexOf("IN PROGRESS");
    const inReviewIdx = html.indexOf("IN REVIEW");
    const readyIdx = html.indexOf("READY");
    expect(inProgressIdx).toBeLessThan(inReviewIdx);
    expect(inReviewIdx).toBeLessThan(readyIdx);
  });

  it("starts all sections expanded by default", () => {
    const html = renderToStaticMarkup(React.createElement(TaskTrackingPanel));
    const expandedMatches = [...html.matchAll(/aria-expanded="true"/g)];
    expect(expandedMatches.length).toBe(3);
  });

  it("shows task cards inside sections when tasks exist", () => {
    const html = renderToStaticMarkup(React.createElement(TaskTrackingPanel));
    expect(html).toContain("Token refresh flow");
    expect(html).toContain("JWT verification");
    expect(html).toContain("User registration API");
  });

  it("does not show tasks with statuses outside the 3 tracked statuses", () => {
    const html = renderToStaticMarkup(React.createElement(TaskTrackingPanel));
    expect(html).not.toContain("Setup OAuth providers");
    expect(html).not.toContain("Orphaned task");
  });

  it("shows actor type badge when available", () => {
    const html = renderToStaticMarkup(React.createElement(TaskTrackingPanel));
    expect(html).toContain("Agent");
  });
});

describe("TaskTrackingSection — collapse/expand", () => {
  const section = {
    status: "in_progress" as const,
    label: "IN PROGRESS",
    items: [
      {
        task: {
          id: "T4",
          title: "Token refresh flow",
          status: "in_progress",
          dependsOn: [],
        },
        feature: {
          id: "auth",
          title: "Auth",
          featureStatus: "in_implementation",
          tasks: [],
        },
      },
    ],
  };

  it("renders as expanded when isExpanded is true", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTrackingSection, {
        section,
        isExpanded: true,
        onToggle: () => undefined,
        onSelectTask: () => undefined,
      }),
    );
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain("Token refresh flow");
  });

  it("hides the task list when isExpanded is false", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTrackingSection, {
        section,
        isExpanded: false,
        onToggle: () => undefined,
        onSelectTask: () => undefined,
      }),
    );
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("Token refresh flow");
  });

  it("shows empty state text when expanded and items is empty", () => {
    const emptySection = { ...section, items: [] };
    const html = renderToStaticMarkup(
      React.createElement(TaskTrackingSection, {
        section: emptySection,
        isExpanded: true,
        onToggle: () => undefined,
        onSelectTask: () => undefined,
      }),
    );
    expect(html).toContain("No tasks.");
  });

  it("does not show empty state when section is collapsed", () => {
    const emptySection = { ...section, items: [] };
    const html = renderToStaticMarkup(
      React.createElement(TaskTrackingSection, {
        section: emptySection,
        isExpanded: false,
        onToggle: () => undefined,
        onSelectTask: () => undefined,
      }),
    );
    expect(html).not.toContain("No tasks.");
  });
});

describe("groupTrackedTasks — filtering", () => {
  it("groups tasks by sidebar statuses only", () => {
    const sections = groupTrackedTasks(mockData.features);
    const inProgress = sections.find((s) => s.status === "in_progress")!;
    const inReview = sections.find((s) => s.status === "in_review")!;
    const ready = sections.find((s) => s.status === "ready")!;

    expect(inProgress.items).toHaveLength(1);
    expect(inProgress.items[0].task.id).toBe("T4");
    expect(inReview.items).toHaveLength(1);
    expect(inReview.items[0].task.id).toBe("T3");
    expect(ready.items).toHaveLength(1);
    expect(ready.items[0].task.id).toBe("T2");
  });

  it("applies search query to filter tasks and features", () => {
    const sections = groupTrackedTasks(mockData.features, "jwt");
    const inReview = sections.find((s) => s.status === "in_review")!;
    const ready = sections.find((s) => s.status === "ready")!;
    expect(inReview.items).toHaveLength(1);
    expect(ready.items).toHaveLength(0);
  });

  it("applies active status filter", () => {
    const sections = groupTrackedTasks(mockData.features, "", {
      statuses: ["in_review"],
    });
    const inProgress = sections.find((s) => s.status === "in_progress")!;
    const inReview = sections.find((s) => s.status === "in_review")!;
    expect(inProgress.items).toHaveLength(0);
    expect(inReview.items).toHaveLength(1);
  });

  it("returns all tasks when active filters statuses is empty", () => {
    const sections = groupTrackedTasks(mockData.features, "", { statuses: [] });
    const total = sections.reduce((sum, s) => sum + s.items.length, 0);
    expect(total).toBe(3);
  });

  it("returns sections in product order: in_progress, in_review, ready", () => {
    const sections = groupTrackedTasks(mockData.features);
    expect(sections[0].status).toBe("in_progress");
    expect(sections[1].status).toBe("in_review");
    expect(sections[2].status).toBe("ready");
  });
});
