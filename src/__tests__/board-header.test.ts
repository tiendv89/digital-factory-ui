import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null, toString: () => "" }),
  usePathname: () => "/board",
}));

const mockWorkspaceContext = vi.hoisted(() => ({
  summaries: [
    {
      workspaceId: "ws-1",
      name: "Startup Project",
      repo_url: "https://github.com/acme/startup.git",
      default_branch: "main",
      last_opened_at: "2026-05-22T00:00:00Z",
    },
  ],
  selectedWorkspaceId: "ws-1",
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
  activateTaskTab: vi.fn(),
  closeTaskTab: vi.fn(),
  activateFeatureTab: vi.fn(),
  closeFeatureTab: vi.fn(),
}));

const mockBoardContext = vi.hoisted(() => ({
  workspaceDetail: {
    id: "ws-1",
    name: "Startup Project",
    slug: "startup-project",
    repo_url: "https://github.com/acme/startup.git",
    source_state: { stale: false, last_synced_at: "2026-05-22T00:00:00Z" },
    updated_at: "2026-05-22T00:00:00Z",
    features: [],
    tasks: [],
  },
  features: [
    {
      id: "feature-tabs",
      title: "Feature tabs",
      featureStatus: "in_implementation",
      tasks: [{ id: "T1", title: "Implement task tab", status: "ready", dependsOn: [] }],
    },
  ],
}));

vi.mock("@/features/workspaces/context/WorkspaceContext", () => ({
  useWorkspaceContext: () => mockWorkspaceContext,
}));

vi.mock("@/features/auth", () => ({
  useSession: () => ({ session: { status: "authenticated", data: null }, logout: vi.fn() }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/workspaces/components/ImportModal/ImportModal", () => ({
  ImportModal: () => React.createElement("div", { "data-import-modal": true }),
}));

vi.mock("../features/board/components/KanbanBoard/KanbanBoard.context", () => ({
  useBoardContext: () => mockBoardContext,
}));

import { BoardHeader } from "../features/board/components/BoardHeader";

describe("BoardHeader", () => {
  beforeEach(() => {
    mockWorkspaceContext.activeSurface = "board";
    mockWorkspaceContext.activeTaskTabId = null;
    mockWorkspaceContext.activeFeatureTabId = null;
    mockWorkspaceContext.openTaskTabs = [];
    mockWorkspaceContext.openFeatureTabs = [];
  });

  it("renders open task and feature tabs inside the workspace header", () => {
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
    mockWorkspaceContext.openFeatureTabs = [
      {
        sessionId: "feature-session-1",
        workspaceId: "ws-1",
        featureId: "feature-uuid-1",
        featureName: "feature-tabs",
        title: "Feature tabs",
      },
    ];

    const html = renderToStaticMarkup(React.createElement(BoardHeader));

    expect(html).toContain("data-workspace-header");
    expect(html).toContain("data-workspace-header-tabs");
    expect(html).toContain('data-task-tab="task-session-1"');
    expect(html).toContain('data-feature-tab="feature-session-1"');
    expect(html).toContain("Startup Project");
  });

  it("renders a New Feature button in the workspace header", () => {
    const html = renderToStaticMarkup(React.createElement(BoardHeader));
    expect(html).toContain("data-new-feature-btn");
  });
});
