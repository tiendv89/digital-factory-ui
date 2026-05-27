import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ActiveFilters } from "../features/board/types";
import type { ParsedFeature } from "../services/yaml-parser";

const mockOpenTaskTab = vi.fn();

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
          description: "Implement POST /api/auth/register endpoint",
          priority: "HIGH",
        },
        {
          id: "T3",
          title: "JWT verification",
          status: "in_review",
          dependsOn: ["T1", "T2"],
        },
        {
          id: "T4",
          title: "JWT Token verification",
          status: "in_progress",
          dependsOn: [],
          description: "Add middleware to verify JWT in protected routes",
          priority: "MID",
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

  const context = {
    features,
    trackedFeatures: features,
    searchQuery: "",
    activeFilters: { statuses: [] } as ActiveFilters,
  };

  return { context, features };
});

vi.mock("../features/board/components/KanbanBoard/KanbanBoard.context", () => ({
  useBoardContext: () => ({
    features: mockData.context.features,
    trackedFeatures: mockData.context.trackedFeatures,
    searchQuery: mockData.context.searchQuery,
    activeFilters: mockData.context.activeFilters,
  }),
  useBoardTrackingContext: () => ({
    trackedFeatures: mockData.context.trackedFeatures,
    openTaskTab: mockOpenTaskTab,
    openTaskTabNewSession: vi.fn(),
  }),
}));

import { TaskTrackingPanel } from "../features/board/components/TaskTrackingPanel";
import { TaskTrackingItem } from "../features/board/components/TaskTrackingPanel/TaskTrackingItem";
import { TaskTrackingSection } from "../features/board/components/TaskTrackingPanel/TaskTrackingSection";
import { groupTrackedTasks } from "../features/board/components/TaskTrackingPanel/groupTasks";

describe("TaskTrackingPanel — companion panel", () => {
  beforeEach(() => {
    mockData.context.features = mockData.features;
    mockData.context.trackedFeatures = mockData.features;
    mockData.context.searchQuery = "";
    mockData.context.activeFilters = { statuses: [] };
    mockOpenTaskTab.mockClear();
  });

  it("renders the compact sidebar header without helper copy", () => {
    const html = renderToStaticMarkup(React.createElement(TaskTrackingPanel));
    expect(html).toContain("Tasks Sidebar");
    expect(html).not.toContain(
      "Expand each status to view tasks directly in the sidebar",
    );
  });

  it("renders all 4 status sections including blocked", () => {
    const html = renderToStaticMarkup(React.createElement(TaskTrackingPanel));
    expect(html).toContain("BLOCKED");
    expect(html).toContain("IN PROGRESS");
    expect(html).toContain("IN REVIEW");
    expect(html).toContain("READY");
  });

  it("renders sections in product order: BLOCKED, IN PROGRESS, IN REVIEW, READY", () => {
    const html = renderToStaticMarkup(React.createElement(TaskTrackingPanel));
    const blockedIdx = html.indexOf("BLOCKED");
    const inProgressIdx = html.indexOf("IN PROGRESS");
    const inReviewIdx = html.indexOf("IN REVIEW");
    const readyIdx = html.indexOf("READY");
    expect(blockedIdx).toBeLessThan(inProgressIdx);
    expect(inProgressIdx).toBeLessThan(inReviewIdx);
    expect(inReviewIdx).toBeLessThan(readyIdx);
  });

  it("starts all sections expanded by default", () => {
    const html = renderToStaticMarkup(React.createElement(TaskTrackingPanel));
    const expandedMatches = [...html.matchAll(/aria-expanded="true"/g)];
    expect(expandedMatches.length).toBe(4);
  });

  it("shows task cards inside sections when tasks exist", () => {
    const html = renderToStaticMarkup(React.createElement(TaskTrackingPanel));
    expect(html).toContain("JWT Token verification");
    expect(html).toContain("JWT verification");
    expect(html).toContain("User registration API");
  });

  it("renders task metadata and action copy in the reference card shape", () => {
    const html = renderToStaticMarkup(React.createElement(TaskTrackingPanel));
    expect(html).toContain("Authentication System");
    expect(html).toContain("MID");
    expect(html).toContain("HIGH");
    expect(html).toContain("Agent");
    expect(html).toContain("Add middleware to verify JWT in protected routes");
    expect(html).toContain("Implement POST /api/auth/register endpoint");
  });

  it("renders each task id as a visible card header badge", () => {
    const html = renderToStaticMarkup(React.createElement(TaskTrackingPanel));
    expect(html).toContain('aria-label="Task T4"');
    expect(html).toContain('aria-label="Task T3"');
    expect(html).toContain('aria-label="Task T2"');
  });

  it("does not show tasks with statuses outside the 4 tracked statuses", () => {
    const html = renderToStaticMarkup(React.createElement(TaskTrackingPanel));
    expect(html).not.toContain("Setup OAuth providers");
    expect(html).not.toContain("Orphaned task");
  });

  it("renders a status age badge for tasks with log timestamps", () => {
    mockData.context.trackedFeatures = [
      {
        id: "auth",
        title: "Auth",
        featureStatus: "in_implementation",
        tasks: [
          {
            id: "T10",
            title: "Task with age",
            status: "in_progress",
            dependsOn: [],
            log: [
              {
                action: "started",
                by: "u@e.com",
                at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
              },
            ],
          },
        ],
      },
    ];
    const html = renderToStaticMarkup(React.createElement(TaskTrackingPanel));
    expect(html).toContain('aria-label="Status age:');
    expect(html).toContain("3h");
  });

  it("does not render a status age badge when no timestamp is available", () => {
    mockData.context.trackedFeatures = [
      {
        id: "auth",
        title: "Auth",
        featureStatus: "in_implementation",
        tasks: [
          {
            id: "T11",
            title: "Task without age",
            status: "ready",
            dependsOn: [],
          },
        ],
      },
    ];
    const html = renderToStaticMarkup(React.createElement(TaskTrackingPanel));
    expect(html).not.toContain('aria-label="Status age:');
  });

  it("shows actor type badge when available", () => {
    const html = renderToStaticMarkup(React.createElement(TaskTrackingPanel));
    expect(html).toContain("Agent");
  });

  it("renders pull-request tracked data instead of stale board data", () => {
    mockData.context.features = [
      {
        id: "dashboard",
        title: "Dashboard",
        featureStatus: "in_implementation",
        tasks: [
          {
            id: "T9",
            title: "Stale main branch task",
            status: "todo",
            dependsOn: [],
          },
        ],
      },
    ];
    mockData.context.trackedFeatures = [
      {
        id: "dashboard",
        title: "Dashboard",
        featureStatus: "in_implementation",
        tasks: [
          {
            id: "T9",
            title: "Live PR task",
            status: "in_review",
            dependsOn: [],
            workspace_pr: {
              status: "open",
              url: "https://github.com/owner/repo/pull/9",
            },
          },
        ],
      },
    ];

    const html = renderToStaticMarkup(React.createElement(TaskTrackingPanel));

    expect(html).toContain("Live PR task");
    expect(html).not.toContain("Stale main branch task");
  });

  it("does not apply Kanban board search or filters to the sidebar source", () => {
    mockData.context.trackedFeatures = [
      {
        id: "dashboard",
        title: "Dashboard",
        featureStatus: "in_implementation",
        tasks: [
          {
            id: "T9",
            title: "Live PR task",
            status: "in_review",
            dependsOn: [],
          },
        ],
      },
    ];
    mockData.context.searchQuery = "does-not-match";
    mockData.context.activeFilters = { statuses: ["ready"] };

    const html = renderToStaticMarkup(React.createElement(TaskTrackingPanel));

    expect(html).toContain("Live PR task");
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

  it("renders the section task count as a prominent badge", () => {
    const denseSection = {
      ...section,
      items: Array.from({ length: 12 }, (_, index) => ({
        task: {
          id: `T${index + 1}`,
          title: `Task ${index + 1}`,
          status: "in_progress",
          dependsOn: [],
        },
        feature: section.items[0].feature,
      })),
    };
    const html = renderToStaticMarkup(
      React.createElement(TaskTrackingSection, {
        section: denseSection,
        isExpanded: false,
        onToggle: () => undefined,
        onSelectTask: () => undefined,
      }),
    );
    expect(html).toContain('aria-label="IN PROGRESS task count"');
    expect(html).toContain("text-sm");
    expect(html).toContain("font-bold");
    expect(html).toContain(">12</span>");
  });
});

describe("TaskTrackingItem — metadata rendering", () => {
  const feature: ParsedFeature = {
    id: "auth",
    title: "Authentication",
    featureStatus: "in_implementation",
    tasks: [],
  };

  it("prefers task description over blocked reason and default next action", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTrackingItem, {
        feature,
        task: {
          id: "T7",
          title: "JWT Token verification",
          status: "ready",
          dependsOn: [],
          description: "Verify JWT before protected route access",
          blockedReason: "Blocked by dependency",
          priority: " high ",
        },
        onSelect: () => undefined,
      }),
    );

    expect(html).toContain("Verify JWT before protected route access");
    expect(html).not.toContain("Blocked by dependency");
    expect(html).not.toContain("Start implementation");
    expect(html).toContain("HIGH");
  });

  it("falls back to blocked reason when description is empty", () => {
    const html = renderToStaticMarkup(
      React.createElement(TaskTrackingItem, {
        feature,
        task: {
          id: "T8",
          title: "Blocked task",
          status: "ready",
          dependsOn: [],
          description: "   ",
          blockedReason: "Waiting on T7",
        },
        onSelect: () => undefined,
      }),
    );

    expect(html).toContain("Waiting on T7");
    expect(html).not.toContain("Start implementation");
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

  it("returns sections in product order: blocked, in_progress, in_review, ready", () => {
    const sections = groupTrackedTasks(mockData.features);
    expect(sections[0].status).toBe("blocked");
    expect(sections[1].status).toBe("in_progress");
    expect(sections[2].status).toBe("in_review");
    expect(sections[3].status).toBe("ready");
  });
});
