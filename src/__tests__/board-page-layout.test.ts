import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockWorkspaceContext = vi.hoisted(() => ({
  activeWorkspace: {
    id: "ws-1",
    name: "workspace",
    slug: "workspace",
    repo_url: "https://github.com/acme/project-workspace.git",
    source_state: { stale: false },
    updated_at: "2026-05-22T00:00:00Z",
    features: [],
    tasks: [],
  },
  loadingWorkspace: false,
  workspaceError: null,
  summaries: [
    {
      workspaceId: "ws-1",
      name: "workspace",
      repo_url: "https://github.com/acme/project-workspace.git",
      default_branch: "main",
      last_opened_at: "2026-05-22T00:00:00Z",
    },
  ],
  activeSurface: "board" as string,
  activeTaskTabId: null as string | null,
  activeFeatureTabId: null as string | null,
  openTaskTabs: [] as Array<{
    sessionId: string;
    workspaceId: string;
    taskId: string;
    taskName: string;
    title: string;
  }>,
  openFeatureTabs: [] as Array<{
    sessionId: string;
    workspaceId: string;
    featureId: string;
    featureName: string;
    title: string;
  }>,
  goToBoard: vi.fn(),
  selectWorkspace: vi.fn(),
  importWorkspace: vi.fn(),
  clearImportError: vi.fn(),
  removeLocalSummary: vi.fn(),
  syncCurrentWorkspace: vi.fn(),
  clearSyncError: vi.fn(),
  openTaskTab: vi.fn(),
  closeTaskTab: vi.fn(),
  activateTaskTab: vi.fn(),
  openFeatureTab: vi.fn(),
  closeFeatureTab: vi.fn(),
  activateFeatureTab: vi.fn(),
}));

vi.mock("@/features/workspaces/context/WorkspaceContext", () => ({
  useWorkspaceContext: () => mockWorkspaceContext,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

vi.mock("@/features/workspaces/components/ImportModal/ImportModal", () => ({
  ImportModal: () => React.createElement("div", { "data-import-modal": true }),
}));

vi.mock("@/features/board/components/BoardHeader/BoardHeader", () => ({
  BoardHeader: () => React.createElement("header", { "data-board-header": true }),
}));

vi.mock("@/features/board/components/KanbanBoard/KanbanBoard.context", () => ({
  BoardProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-board-provider": true }, children),
}));

vi.mock("@/features/board/components/KanbanBoard/KanbanBoard", () => ({
  KanbanBoard: () => React.createElement("div", { "data-kanban-board": true }),
}));

vi.mock("@/features/board/components/TaskTrackingPanel/TaskTrackingPanel", () => ({
  TaskTrackingPanel: () =>
    React.createElement("aside", { "data-task-tracking-panel": true }),
}));

vi.mock("@/features/board/components/FeatureTabView/FeatureTabView", () => ({
  FeatureTabView: () =>
    React.createElement("div", { "data-feature-tab-view": true }),
}));

import BoardPage from "../app/(shell)/board/page";

describe("BoardPage layout", () => {
  beforeEach(() => {
    mockWorkspaceContext.activeSurface = "board";
    mockWorkspaceContext.activeTaskTabId = null;
    mockWorkspaceContext.activeFeatureTabId = null;
    mockWorkspaceContext.openTaskTabs = [];
    mockWorkspaceContext.openFeatureTabs = [];
  });

  it("renders the board surface with a single header row instead of a separate workspace tab row", () => {
    const html = renderToStaticMarkup(React.createElement(BoardPage));

    expect(html).toContain("data-board-header");
    expect(html).not.toContain("data-workspace-tab-bar");
  });

  it("keeps /board on the kanban surface when a task tab session is active", () => {
    mockWorkspaceContext.activeSurface = "task-tab";
    mockWorkspaceContext.activeTaskTabId = "task-session-1";
    mockWorkspaceContext.openTaskTabs = [
      {
        sessionId: "task-session-1",
        workspaceId: "ws-1",
        taskId: "task-uuid-1",
        taskName: "T1",
        title: "Implement task tab",
      },
    ];

    const html = renderToStaticMarkup(React.createElement(BoardPage));

    expect(html).toContain("data-board-header");
    expect(html).toContain("data-kanban-board");
    expect(html).not.toContain("data-task-tab-view");
    expect(html).not.toContain("data-workspace-tab-bar");
  });

  it("keeps /board on the kanban surface when a feature tab session is active", () => {
    mockWorkspaceContext.activeSurface = "feature-tab";
    mockWorkspaceContext.activeFeatureTabId = "feature-session-1";
    mockWorkspaceContext.openFeatureTabs = [
      {
        sessionId: "feature-session-1",
        workspaceId: "ws-1",
        featureId: "feature-uuid-1",
        featureName: "feature-tabs",
        title: "Feature tabs",
      },
    ];

    const html = renderToStaticMarkup(React.createElement(BoardPage));

    expect(html).toContain("data-board-header");
    expect(html).toContain("data-kanban-board");
    expect(html).not.toContain("data-feature-tab-view");
    expect(html).not.toContain("data-workspace-tab-bar");
  });
});
