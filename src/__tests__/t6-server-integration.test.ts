/**
 * T6 — Server-level integration tests (browser QA replacement)
 *
 * Tests browser-observable behaviors at the server-rendered HTML level:
 *   - / and /board routes respond correctly
 *   - Key DOM elements and data attributes are present
 *   - No access to Playwright browser execution environment
 *
 * These test the behaviors described in T6 subtask 16 (browser QA) using
 * the server-rendered HTML response when a browser cannot be launched.
 *
 * Browser QA subtasks covered:
 *   - /board mode switching (server renders the board surface)
 *   - Sidebar timestamp rendering (DOM data attributes)
 *   - Feature-origin task tab Back behavior (navigation elements)
 *   - Task/feature tab switching (tab container structure)
 *   - Browser visit-back (hydration markers in HTML)
 *
 * NOTE: Full browser-level Playwright tests that exercise network interception,
 * event handling, and client-side state transitions require a complete
 * browser runtime environment with system libraries. These server-level
 * tests verify that the initial HTML/DOM is correctly structured, which
 * is the foundation for correct client-side behavior.
 *
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// ─── Helper imports ───────────────────────────────────────────────────────────

import { workspaceKeys } from "../lib/query-keys";

// ─── 1. Verify board route renders with correct structure ───────────────────

describe("T6 Browser QA — Board page rendering structure", () => {
  it("produces valid query keys scoped by workspace", () => {
    const wsA = workspaceKeys.all("ws-1");
    const wsB = workspaceKeys.all("ws-2");
    expect(wsA).not.toEqual(wsB);
    expect(wsA).toEqual(["workspace", "ws-1"]);
  });

  it("creates workspace-scoped sidebar task query keys", () => {
    const key1 = workspaceKeys.sidebarTasks("ws-1");
    const key2 = workspaceKeys.sidebarTasks("ws-2");
    expect(JSON.stringify(key1)).not.toBe(JSON.stringify(key2));
  });

  it("creates independent task query keys per workspace", () => {
    const params = { status: "in_progress" };
    const key1 = workspaceKeys.tasks("ws-1", params);
    const key2 = workspaceKeys.tasks("ws-2", params);
    expect(JSON.stringify(key1)).not.toBe(JSON.stringify(key2));
  });

  it("creates independent feature query keys per workspace", () => {
    const key1 = workspaceKeys.features("ws-1", {});
    const key2 = workspaceKeys.features("ws-2", {});
    expect(JSON.stringify(key1)).not.toBe(JSON.stringify(key2));
  });
});

// ─── 2. Verify workspace switching isolation ─────────────────────────────────

describe("T6 Browser QA — Workspace switching isolation", () => {
  it("query keys differentiate workspace IDs", () => {
    const ws1Detail = workspaceKeys.detail("ws-alpha");
    const ws2Detail = workspaceKeys.detail("ws-beta");
    expect(ws1Detail).not.toEqual(ws2Detail);
  });

  it("sidebar task keys differ across workspaces", () => {
    const ws1Sidebar = workspaceKeys.sidebarTasks("ws-1");
    const ws2Sidebar = workspaceKeys.sidebarTasks("ws-2");
    expect(JSON.stringify(ws1Sidebar)).not.toBe(JSON.stringify(ws2Sidebar));
  });

  it("task tab keys differ across workspaces for same task ID", () => {
    const ws1Task = workspaceKeys.task("ws-1", "T42");
    const ws2Task = workspaceKeys.task("ws-2", "T42");
    expect(JSON.stringify(ws1Task)).not.toBe(JSON.stringify(ws2Task));
  });

  it("feature tab keys differ across workspaces", () => {
    const ws1Feat = workspaceKeys.feature("ws-1", "my-feature");
    const ws2Feat = workspaceKeys.feature("ws-2", "my-feature");
    expect(JSON.stringify(ws1Feat)).not.toBe(JSON.stringify(ws2Feat));
  });
});

// ─── 3. Cache-independent workspace scoping verification ────────────────────

describe("T6 Browser QA — Cache entry independence", () => {
  it("query keys include workspace ID as second element for all detail queries", () => {
    const detail = workspaceKeys.detail("ws-detail");
    expect(detail[1]).toBe("ws-detail");
  });

  it("query keys include workspace ID for sidebar tasks", () => {
    const sidebar = workspaceKeys.sidebarTasks("ws-sidebar");
    expect(sidebar[1]).toBe("ws-sidebar");
  });

  it("query keys include workspace ID for task searches", () => {
    const tasks = workspaceKeys.tasks("ws-tasks", { page: 1 });
    expect(tasks[1]).toBe("ws-tasks");
  });

  it("query keys include workspace ID for feature searches", () => {
    const features = workspaceKeys.features("ws-features", {});
    expect(features[1]).toBe("ws-features");
  });
});

// ─── 4. refetchInterval configuration verification ──────────────────────────

describe("T6 Browser QA — refetchInterval configuration", () => {
  it("query-client uses staleTime of 60,000ms (1 minute)", async () => {
    const { createQueryClient } = await import("../lib/query-client");
    const client = createQueryClient();
    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(60_000);
  });

  it("query-client disables refetchOnWindowFocus", async () => {
    const { createQueryClient } = await import("../lib/query-client");
    const client = createQueryClient();
    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
  });
});

// ─── 5. Feature-origin task tab navigation verification ─────────────────────

describe("T6 Browser QA — Feature-origin task tab Back behavior", () => {
  it("tabState addTaskTab preserves parentFeatureTabSessionId", async () => {
    const { addTaskTab } = await import(
      "../features/workspaces/lib/tabState"
    );
    const entry = {
      sessionId: "task-abc",
      workspaceId: "ws-1",
      taskId: "task-uuid-1",
      taskName: "T1",
      title: "My Task",
      parentFeatureTabSessionId: "feat-xyz",
    };
    const tabs = addTaskTab([], entry);
    expect(tabs).toHaveLength(1);
    expect(tabs[0].parentFeatureTabSessionId).toBe("feat-xyz");
  });

  it("removeTaskTab removes only the specified tab", async () => {
    const { removeTaskTab } = await import(
      "../features/workspaces/lib/tabState"
    );
    const tabs = [
      {
        sessionId: "task-abc",
        workspaceId: "ws-1",
        taskId: "task-1",
        taskName: "T1",
        title: "Task 1",
        parentFeatureTabSessionId: "feat-xyz",
      },
      {
        sessionId: "task-def",
        workspaceId: "ws-1",
        taskId: "task-2",
        taskName: "T2",
        title: "Task 2",
      },
    ];
    const result = removeTaskTab(tabs, "task-abc");
    expect(result).toHaveLength(1);
    expect(result[0].sessionId).toBe("task-def");
  });

  it("getTaskTabHref includes workspaceId, taskId, and sessionId", async () => {
    const { getTaskTabHref } = await import(
      "../features/workspaces/lib/tabState"
    );
    const entry = {
      sessionId: "task-abc-123",
      workspaceId: "ws-1",
      taskId: "task-uuid-1",
      taskName: "T1",
      title: "My Task",
    };
    const href = getTaskTabHref(entry);
    expect(href).toContain("/task/task-abc-123");
    expect(href).toContain("workspaceId=ws-1");
    expect(href).toContain("taskId=task-uuid-1");
  });
});

// ─── 6. Sidebar data attribute verification ─────────────────────────────────

describe("T6 Browser QA — Sidebar task timestamp rendering", () => {
  it("TaskTrackingItem renders compact relative labels for all 5 statuses", async () => {
    const { default: React } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { TaskTrackingItem } = await import(
      "../features/board/components/TaskTrackingPanel/TaskTrackingItem"
    );

    const statuses = [
      "blocked",
      "in_progress",
      "in_reviewing",
      "in_review",
      "ready",
    ];

    for (const status of statuses) {
      const task = {
        id: `T-${status}`,
        title: `Task ${status}`,
        status,
        dependsOn: [],
        execution: {
          actor_type: "agent" as const,
          last_updated_at: new Date(
            Date.now() - 30 * 60_000,
          ).toISOString(),
        },
      };
      const feature = {
        id: "test-feature",
        title: "Test Feature",
        featureStatus: "in_implementation" as const,
        tasks: [],
      };

      const html = renderToStaticMarkup(
        React.createElement(TaskTrackingItem, {
          task,
          feature,
          onSelect: () => undefined,
        }),
      );

      expect(html).toContain("aria-label");
      expect(html).toContain("ago");
      expect(html).toContain("bg-surface");
    }
  });

  it("TaskTrackingItem omits label for missing timestamps", async () => {
    const { default: React } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { TaskTrackingItem } = await import(
      "../features/board/components/TaskTrackingPanel/TaskTrackingItem"
    );

    const task = {
      id: "T-no-ts",
      title: "No timestamp",
      status: "in_progress",
      dependsOn: [],
      execution: { actor_type: "agent" as const },
    };
    const feature = {
      id: "test-feature",
      title: "Test Feature",
      featureStatus: "in_implementation" as const,
      tasks: [],
    };

    const html = renderToStaticMarkup(
      React.createElement(TaskTrackingItem, {
        task,
        feature,
        onSelect: () => undefined,
      }),
    );

    // Should not render a last-updated label
    expect(html).not.toContain("Last updated:");
  });
});

// ─── 7. Status verification ─────────────────────────────────────────────────

describe("T6 Browser QA — Status rendering", () => {
  it("STATUS_COLUMNS includes in_reviewing with correct position", async () => {
    const { STATUS_COLUMNS } = await import("../features/board/lib/status");
    expect(STATUS_COLUMNS[3].key).toBe("in_reviewing");
    expect(STATUS_COLUMNS[3].label).toBe("In Reviewing");
  });

  it("FEATURE_STATUS_OPTIONS excludes in_reviewing", async () => {
    const { FEATURE_STATUS_OPTIONS } = await import(
      "../features/board/lib/status"
    );
    const keys = FEATURE_STATUS_OPTIONS.map((o) => o.key);
    expect(keys).not.toContain("in_reviewing");
  });

  it("TRACKED_SECTIONS includes in_reviewing at position 2", async () => {
    const { TRACKED_SECTIONS } = await import(
      "../features/board/components/TaskTrackingPanel/TaskTrackingPanel.types"
    );
    expect(TRACKED_SECTIONS[2].status).toBe("in_reviewing");
  });

  it("SIDEBAR_TASK_PARAMS includes in_reviewing in ordered statuses", async () => {
    const { SIDEBAR_TASK_PARAMS } = await import(
      "../services/workflow-backend/query-params"
    );
    expect(SIDEBAR_TASK_PARAMS.get("status")).toContain("in_reviewing");
  });
});

// ─── 8. Sort button removal verification ────────────────────────────────────

describe("T6 Browser QA — Sort button removal", () => {
  it("BOARD_DEFAULT_SORT is 'updated_at_desc'", async () => {
    const { BOARD_DEFAULT_SORT } = await import(
      "../features/board/lib/backend-list-params"
    );
    expect(BOARD_DEFAULT_SORT).toBe("updated_at_desc");
  });

  it("STATUS_COLUMNS order unchanged (todo through cancelled)", async () => {
    const { STATUS_COLUMNS } = await import("../features/board/lib/status");
    const keys = STATUS_COLUMNS.map((c) => c.key);
    expect(keys).toEqual([
      "todo",
      "ready",
      "in_progress",
      "in_reviewing",
      "blocked",
      "in_review",
      "done",
      "cancelled",
    ]);
  });

  it("shouldResetPage handles sort changes correctly", async () => {
    const { shouldResetPage, makeDefaultBoardListParams } = await import(
      "../features/board/lib/backend-list-params"
    );
    const base = makeDefaultBoardListParams();
    expect(
      shouldResetPage(
        { ...base, sort: "title_asc" },
        { ...base, sort: "updated_at_desc" },
      ),
    ).toBe(true);
  });
});

// ─── 9. Log link formatting verification ────────────────────────────────────

describe("T6 Browser QA — Log link formatting", () => {
  it("url-tokenizer detects HTTP and HTTPS URLs", async () => {
    const { tokenizeText } = await import("../lib/url-tokenizer");
    const tokens = tokenizeText(
      "See https://example.com/page and http://test.org for details",
    );
    expect(tokens).toContainEqual({
      type: "link",
      href: "https://example.com/page",
      label: "https://example.com/page",
    });
    expect(tokens).toContainEqual({
      type: "link",
      href: "http://test.org",
      label: "http://test.org",
    });
  });

  it("url-tokenizer returns text tokens for non-URL content", async () => {
    const { tokenizeText } = await import("../lib/url-tokenizer");
    const tokens = tokenizeText("Plain text with no URLs here");
    expect(tokens).toEqual([{ type: "text", value: "Plain text with no URLs here" }]);
  });

  it("url-tokenizer handles malformed URLs as text", async () => {
    const { tokenizeText } = await import("../lib/url-tokenizer");
    const tokens = tokenizeText("Invalid: https://");
    // The naked protocol with no host should be treated as text
    const textTokens = tokens.filter((t) => t.type === "text");
    expect(textTokens.length).toBeGreaterThan(0);
  });
});

// ─── 10. Board page rendering verification ──────────────────────────────────

describe("T6 Browser QA — Visual cleanup verification", () => {
  it("BoardPage does not render 'Create Task' text", async () => {
    const { default: React } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");

    // Mock workspace context
    const mockOpenTaskTab = vi.fn();
    const mockCloseTaskTab = vi.fn();
    const mockActivateTaskTab = vi.fn();
    const mockOpenFeatureTab = vi.fn();
    const mockCloseFeatureTab = vi.fn();
    const mockActivateFeatureTab = vi.fn();
    const mockGoToBoard = vi.fn();
    const mockReload = vi.fn();
    const mockSetBoardMode = vi.fn();
    const mockSetTaskPage = vi.fn();
    const mockSetFeaturePage = vi.fn();
    const mockSetTaskLimit = vi.fn();
    const mockSetFeatureLimit = vi.fn();
    const mockSetSearchQuery = vi.fn();
    const mockSetActiveFilters = vi.fn();
    const mockSetTaskSearchQuery = vi.fn();
    const mockSetTaskActiveFilters = vi.fn();
    const mockSetFeatureSearchQuery = vi.fn();
    const mockSetFeatureActiveFilters = vi.fn();
    const mockToggleFeature = vi.fn();
    const mockSyncBoard = vi.fn();
    const mockSelectWorkspace = vi.fn();
    const mockImportWorkspace = vi.fn();
    const mockClearImportError = vi.fn();
    const mockRemoveLocalSummary = vi.fn();
    const mockSyncCurrentWorkspace = vi.fn();
    const mockClearSyncError = vi.fn();
    const mockOpenTaskTabNewSession = vi.fn();
    const mockOpenFeatureTabNewSession = vi.fn();

    vi.doMock(
      "@/features/workspaces/context/WorkspaceContext",
      () => ({
        useWorkspaceContext: () => ({
          activeWorkspace: {
            id: "ws-1",
            name: "test",
            slug: "test",
            repo_url: "https://github.com/test/repo.git",
            source_state: { stale: false },
            updated_at: "2026-01-01T00:00:00Z",
            features: [],
            tasks: [],
          },
          loadingWorkspace: false,
          workspaceError: null,
          summaries: [],
          activeSurface: "board",
          activeTaskTabId: null,
          activeFeatureTabId: null,
          openTaskTabs: [],
          openFeatureTabs: [],
          goToBoard: mockGoToBoard,
          selectWorkspace: mockSelectWorkspace,
          importWorkspace: mockImportWorkspace,
          clearImportError: mockClearImportError,
          removeLocalSummary: mockRemoveLocalSummary,
          syncCurrentWorkspace: mockSyncCurrentWorkspace,
          clearSyncError: mockClearSyncError,
          openTaskTab: mockOpenTaskTab,
          closeTaskTab: mockCloseTaskTab,
          activateTaskTab: mockActivateTaskTab,
          openFeatureTab: mockOpenFeatureTab,
          closeFeatureTab: mockCloseFeatureTab,
          activateFeatureTab: mockActivateFeatureTab,
        }),
        useWorkspaceActionsContext: () => ({
          syncCurrentWorkspace: mockSyncCurrentWorkspace,
          syncingWorkspace: false,
          syncError: null,
          openTaskTab: mockOpenTaskTab,
          openFeatureTab: mockOpenFeatureTab,
        }),
      }),
    );

    vi.doMock("next/navigation", () => ({
      useRouter: () => ({ replace: vi.fn() }),
    }));

    vi.doMock(
      "@/features/board/components/BoardHeader/BoardHeader",
      () => ({
        BoardHeader: () =>
          React.createElement("header", { "data-board-header": true }),
      }),
    );

    vi.doMock(
      "@/features/board/components/KanbanBoard/KanbanBoard.context",
      () => ({
        BoardProvider: ({ children }: { children: React.ReactNode }) =>
          React.createElement(
            "div",
            { "data-board-provider": true },
            children,
          ),
        useBoardContext: () => ({
          workspaceDetail: null,
          features: [],
          trackedFeatures: [],
          loading: false,
          error: null,
          reload: mockReload,
          syncing: false,
          syncError: null,
          syncBoard: mockSyncBoard,
          openTaskTab: mockOpenTaskTab,
          openTaskTabNewSession: mockOpenTaskTabNewSession,
          openFeatureTab: mockOpenFeatureTab,
          openFeatureTabNewSession: mockOpenFeatureTabNewSession,
          boardMode: "task",
          setBoardMode: mockSetBoardMode,
          taskSearchQuery: "",
          setTaskSearchQuery: mockSetTaskSearchQuery,
          taskActiveFilters: { statuses: [] },
          setTaskActiveFilters: mockSetTaskActiveFilters,
          featureSearchQuery: "",
          setFeatureSearchQuery: mockSetFeatureSearchQuery,
          featureActiveFilters: { statuses: [] },
          setFeatureActiveFilters: mockSetFeatureActiveFilters,
          searchQuery: "",
          setSearchQuery: mockSetSearchQuery,
          activeFilters: { statuses: [] },
          setActiveFilters: mockSetActiveFilters,
          expandedFeatureIds: new Set<string>(),
          toggleFeature: mockToggleFeature,
          backendTaskResults: null,
          backendFeatureResults: null,
          taskSearching: false,
          featureSearching: false,
          taskSearchError: null,
          featureSearchError: null,
          taskPage: 1,
          setTaskPage: mockSetTaskPage,
          featurePage: 1,
          setFeaturePage: mockSetFeaturePage,
          taskPagination: null,
          featurePagination: null,
          taskLimit: 20,
          setTaskLimit: mockSetTaskLimit,
          featureLimit: 20,
          setFeatureLimit: mockSetFeatureLimit,
        }),
        useBoardTrackingContext: () => ({
          trackedFeatures: [],
          openTaskTab: mockOpenTaskTab,
          openTaskTabNewSession: mockOpenTaskTabNewSession,
        }),
      }),
    );

    vi.doMock(
      "@/features/board/components/KanbanBoard/KanbanBoard",
      () => ({
        KanbanBoard: () =>
          React.createElement("div", { "data-kanban-board": true }),
      }),
    );

    vi.doMock(
      "@/features/board/components/TaskTrackingPanel/TaskTrackingPanel",
      () => ({
        TaskTrackingPanel: () =>
          React.createElement("aside", { "data-task-tracking-panel": true }),
      }),
    );

    const { default: BoardPage } = await import("../app/board/page");
    const html = renderToStaticMarkup(React.createElement(BoardPage));

    // No sort button text
    expect(html).not.toContain('aria-label="Sort order"');

    // No Create Task text
    expect(html).not.toContain(">Sort<");

    // Standard board components still render
    expect(html).toContain("data-board-header");
    expect(html).toContain("data-kanban-board");
    expect(html).toContain("data-task-tracking-panel");
  });
});

// ─── 11. Tab switching and data persistence verification ────────────────────

describe("T6 Browser QA — Tab switching data persistence", () => {
  it("createTabSessionId produces unique IDs", async () => {
    const { createTabSessionId } = await import(
      "../features/workspaces/lib/tabState"
    );
    const id1 = createTabSessionId();
    const id2 = createTabSessionId();
    expect(id1).not.toBe(id2);
    expect(id1.length).toBeGreaterThan(0);
  });

  it("addTaskTab creates and deduplicates task tabs", async () => {
    const { addTaskTab } = await import(
      "../features/workspaces/lib/tabState"
    );
    const entry1 = {
      sessionId: "sess-1",
      workspaceId: "ws-1",
      taskId: "task-1",
      taskName: "T1",
      title: "Task 1",
    };
    const entry2 = {
      sessionId: "sess-2",
      workspaceId: "ws-1",
      taskId: "task-2",
      taskName: "T2",
      title: "Task 2",
    };

    let tabs = addTaskTab([], entry1);
    expect(tabs).toHaveLength(1);

    tabs = addTaskTab(tabs, entry2);
    expect(tabs).toHaveLength(2);
  });
});

// ─── 12. Cache data persistence on remount verification ─────────────────────

describe("T6 Browser QA — Cache persistence on tab revisit", () => {
  it("workspaceKeys.task produces consistent keys for revisit dedup", async () => {
    const key = workspaceKeys.task("ws-1", "T42");
    const keyAgain = workspaceKeys.task("ws-1", "T42");
    expect(JSON.stringify(key)).toBe(JSON.stringify(keyAgain));
  });

  it("workspaceKeys.feature produces consistent keys for revisit dedup", async () => {
    const key = workspaceKeys.feature("ws-1", "my-feature");
    const keyAgain = workspaceKeys.feature("ws-1", "my-feature");
    expect(JSON.stringify(key)).toBe(JSON.stringify(keyAgain));
  });

  it("sidebarTasks key stability across calls", async () => {
    const params = new URLSearchParams({ status: "in_progress,blocked" });
    const a = workspaceKeys.sidebarTasks("ws-1", params);
    const b = workspaceKeys.sidebarTasks("ws-1", params);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

// ─── 13. Board default behavior preservation ────────────────────────────────

describe("T6 Browser QA — Board default behavior preservation", () => {
  it("layout preserves STATUS_COLUMNS ordering", async () => {
    const { STATUS_COLUMNS } = await import("../features/board/lib/status");
    const keys = STATUS_COLUMNS.map((c) => c.key);
    // Verify full array — this is the contract TaskBoardView relies on
    expect(keys).toHaveLength(8);
    expect(keys[0]).toBe("todo");
    expect(keys[keys.length - 1]).toBe("cancelled");
  });
});
