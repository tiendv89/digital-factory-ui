/**
 * T3 — Remove write affordances from client-reachable routes
 *
 * Verifies that:
 * 1. CreateTaskButton component is deleted (not importable)
 * 2. BoardHeader renders no write controls (no "Create task", no "Sync")
 * 3. KanbanBoard / BoardControls renders no Sync button
 * 4. StaleBanner shows informational warning only, no Sync/Retry buttons
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceDetail } from "../services/workflow-backend/types";
import type { ActiveFilters, BoardLoadError, FeatureActiveFilters } from "../features/board/types";

// ─── Top-level mocks ──────────────────────────────────────────────────────

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

const mockBoardContextRef = vi.hoisted(() => ({
  current: {
    workspaceDetail: {
      id: "ws-1",
      name: "Startup Project",
      slug: "startup-project",
      repo_url: "https://github.com/acme/startup.git",
      source_state: { stale: false },
      updated_at: "2026-05-22T00:00:00Z",
      features: [],
      tasks: [],
    } as WorkspaceDetail,
    features: [],
    trackedFeatures: [],
    loading: false,
    error: null as BoardLoadError | null,
    reload: vi.fn(),
    syncing: false,
    syncError: null as BoardLoadError | null,
    syncBoard: vi.fn(),
    openTaskTab: vi.fn(),
    openTaskTabNewSession: vi.fn(),
    openFeatureTab: vi.fn(),
    openFeatureTabNewSession: vi.fn(),
    boardMode: "task" as "task" | "feature",
    setBoardMode: vi.fn(),
    taskSearchQuery: "",
    setTaskSearchQuery: vi.fn(),
    taskActiveFilters: { statuses: [] as string[] } as ActiveFilters,
    setTaskActiveFilters: vi.fn(),
    featureSearchQuery: "",
    setFeatureSearchQuery: vi.fn(),
    featureActiveFilters: { statuses: [] as string[] } as FeatureActiveFilters,
    setFeatureActiveFilters: vi.fn(),
    searchQuery: "",
    setSearchQuery: vi.fn(),
    activeFilters: { statuses: [] as string[] } as ActiveFilters,
    setActiveFilters: vi.fn(),
    expandedFeatureIds: new Set<string>(),
    toggleFeature: vi.fn(),
    backendTaskResults: null,
    backendFeatureResults: null,
    taskSearching: false,
    featureSearching: false,
    taskSearchError: null as BoardLoadError | null,
    featureSearchError: null as BoardLoadError | null,
    taskPage: 1,
    setTaskPage: vi.fn(),
    featurePage: 1,
    setFeaturePage: vi.fn(),
    taskPagination: null,
    featurePagination: null,
    taskLimit: 20,
    setTaskLimit: vi.fn(),
    featureLimit: 20,
    setFeatureLimit: vi.fn(),
  },
}));

vi.mock("@/features/workspaces/context/WorkspaceContext", () => ({
  useWorkspaceContext: () => mockWorkspaceContext,
  useWorkspaceActionsContext: () => ({
    syncCurrentWorkspace: vi.fn(),
    syncingWorkspace: false,
    syncError: null,
    openTaskTab: vi.fn(),
    openFeatureTab: vi.fn(),
  }),
}));

vi.mock("@/features/auth", () => ({
  useSession: () => ({
    session: { status: "authenticated", data: null },
    logout: vi.fn(),
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/workspaces/components/ImportModal/ImportModal", () => ({
  ImportModal: () => React.createElement("div", { "data-import-modal": true }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null, toString: () => "" }),
  usePathname: () => "/board",
}));

vi.mock("../features/board/components/KanbanBoard/KanbanBoard.context", () => ({
  useBoardContext: () => mockBoardContextRef.current,
  useBoardTrackingContext: () => ({
    trackedFeatures: [],
    openTaskTab: vi.fn(),
    openTaskTabNewSession: vi.fn(),
  }),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────

import { BoardHeader } from "../features/board/components/BoardHeader/BoardHeader";
import { KanbanBoard } from "../features/board/components/KanbanBoard/KanbanBoard";

// ─── 1. CreateTaskButton does not exist ───────────────────────────────────

import * as fs from "node:fs";
import * as path from "node:path";

describe("T3 — CreateTaskButton is deleted", () => {
  it("CreateTaskButton directory no longer exists", () => {
    const dir = path.resolve(
      __dirname,
      "../features/board/components/CreateTaskButton",
    );
    expect(fs.existsSync(dir)).toBe(false);
  });

  it("CreateTaskButton.tsx source file no longer exists", () => {
    const file = path.resolve(
      __dirname,
      "../features/board/components/CreateTaskButton/CreateTaskButton.tsx",
    );
    expect(fs.existsSync(file)).toBe(false);
  });
});

// ─── 2. BoardHeader has no write controls ────────────────────────────────

describe("T3 — BoardHeader renders no write affordances", () => {
  beforeEach(() => {
    mockWorkspaceContext.activeSurface = "board";
    mockWorkspaceContext.activeTaskTabId = null;
    mockWorkspaceContext.activeFeatureTabId = null;
    mockWorkspaceContext.openTaskTabs = [];
    mockWorkspaceContext.openFeatureTabs = [];
    mockBoardContextRef.current.workspaceDetail = {
      id: "ws-1",
      name: "Startup Project",
      slug: "startup-project",
      repo_url: "https://github.com/acme/startup.git",
      source_state: { stale: false },
      updated_at: "2026-05-22T00:00:00Z",
      features: [],
      tasks: [],
    };
    mockBoardContextRef.current.syncError = null;
  });

  it("does not render 'Create Task' button text", () => {
    const html = renderToStaticMarkup(React.createElement(BoardHeader));
    expect(html).not.toContain("Create Task");
    expect(html).not.toContain('aria-label="Create new task"');
  });

  it("does not render a Sync button", () => {
    const html = renderToStaticMarkup(React.createElement(BoardHeader));
    expect(html).not.toContain('aria-label="Sync workspace data"');
    expect(html).not.toContain(">Sync<");
    expect(html).not.toContain(">Sync now<");
  });

  it("still renders the workspace header structure", () => {
    const html = renderToStaticMarkup(React.createElement(BoardHeader));
    expect(html).toContain("data-workspace-header");
  });
});

// ─── 3. KanbanBoard / BoardControls renders no Sync button ────────────────

describe("T3 — KanbanBoard BoardControls has no Sync button", () => {
  beforeEach(() => {
    mockBoardContextRef.current.workspaceDetail = {
      id: "ws-1",
      name: "Startup Project",
      slug: "startup-project",
      repo_url: "https://github.com/acme/startup.git",
      source_state: { stale: false },
      updated_at: "2026-05-22T00:00:00Z",
      features: [],
      tasks: [],
    };
    mockBoardContextRef.current.syncError = null;
    mockBoardContextRef.current.syncing = false;
    mockBoardContextRef.current.boardMode = "task";
  });

  it("does not render 'Sync workspace data' aria-label", () => {
    const html = renderToStaticMarkup(React.createElement(KanbanBoard));
    expect(html).not.toContain('aria-label="Sync workspace data"');
  });

  it("does not render 'Sync' button text", () => {
    const html = renderToStaticMarkup(React.createElement(KanbanBoard));
    expect(html).not.toContain(">Sync<");
    expect(html).not.toContain(">Syncing...<");
  });

  it("still renders board controls with Filter and Search", () => {
    const html = renderToStaticMarkup(React.createElement(KanbanBoard));
    expect(html).toContain("data-board-controls");
    expect(html).toContain("Search board");
    expect(html).toContain("Filter");
  });
});

// ─── 4. StaleBanner shows warning text only, no sync/retry buttons ────────

describe("T3 — StaleBanner shows no Sync/Retry write controls", () => {
  it("stale workspace shows no 'Sync now' button", () => {
    mockBoardContextRef.current.workspaceDetail = {
      id: "ws-1",
      name: "Stale WS",
      slug: "stale-ws",
      repo_url: "https://github.com/acme/ws.git",
      source_state: { stale: true },
      updated_at: "2026-05-22T00:00:00Z",
      features: [],
      tasks: [],
    };
    mockBoardContextRef.current.syncError = null;

    const html = renderToStaticMarkup(React.createElement(KanbanBoard));
    expect(html).not.toContain('aria-label="Sync workspace to refresh data"');
    expect(html).not.toContain(">Sync now<");
    expect(html).not.toContain(">Syncing…<");
    expect(html).toContain('role="alert"');
  });

  it("sync-error state shows no Retry button", () => {
    mockBoardContextRef.current.workspaceDetail = {
      id: "ws-1",
      name: "Startup Project",
      slug: "startup-project",
      repo_url: "https://github.com/acme/startup.git",
      source_state: { stale: false },
      updated_at: "2026-05-22T00:00:00Z",
      features: [],
      tasks: [],
    };
    mockBoardContextRef.current.syncError = {
      kind: "network_error" as const,
      message: "Timed out",
      retryable: true,
    };

    const html = renderToStaticMarkup(React.createElement(KanbanBoard));
    expect(html).not.toContain('aria-label="Retry workspace sync"');
    expect(html).not.toContain(">Retry<");
    expect(html).toContain('role="alert"');
    expect(html).toContain("Data unavailable");
  });
});
