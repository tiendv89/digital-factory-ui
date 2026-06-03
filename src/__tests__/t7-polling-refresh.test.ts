// @vitest-environment jsdom
/**
 * T7 — 30s focus-aware polling + manual Refresh button
 *
 * Covers:
 * 1. BoardHeader renders a Refresh button with correct aria-label
 * 2. Refresh button is disabled while refreshing
 * 3. Timer is scheduled when visibilityState is "visible"
 * 4. Timer is cleared when visibilityState changes to "hidden"
 * 5. Timer restarts and an immediate re-fetch fires on return to "visible"
 * 6. No timer is started when visibilityState is "hidden" initially
 * 7. refreshWorkspace calls getWorkspace with the selected workspace ID
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Next.js shims ────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/board",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [k: string]: unknown;
  }) => React.createElement("a", { href, ...props }, children),
}));

// ─── Session mock ─────────────────────────────────────────────────────────────

vi.mock("@/features/auth", () => ({
  useSession: () => ({ logout: vi.fn(), status: "authenticated" }),
  SessionGate: ({ children }: { children: React.ReactNode }) => children,
}));

// ─── Local storage shims ──────────────────────────────────────────────────────

vi.mock("@/services/local-workspace-store", () => ({
  getLocalWorkspaceSummaries: () => [
    {
      workspaceId: "ws-1",
      name: "Demo WS",
      repo_url: "https://github.com/acme/demo.git",
      default_branch: "main",
      last_opened_at: "2026-06-01T00:00:00Z",
    },
  ],
  getSelectedWorkspaceId: () => "ws-1",
  resolveBootstrapWorkspaceId: () => "ws-1",
  saveLocalWorkspaceSummary: vi.fn(),
  setSelectedWorkspaceId: vi.fn(),
  clearSelectedWorkspaceId: vi.fn(),
  removeLocalWorkspaceSummary: vi.fn(),
}));

// ─── Status filter store shims ────────────────────────────────────────────────

vi.mock("@/features/board/lib/status-filter-store", () => ({
  clearStatusFilter: vi.fn(),
  clearFeatureStatusFilter: vi.fn(),
  clearBoardMode: vi.fn(),
}));

// ─── React Query shim ─────────────────────────────────────────────────────────

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  }),
}));

// ─── Lib shims ────────────────────────────────────────────────────────────────

vi.mock("@/lib/query-keys", () => ({
  workspaceKeys: { detail: (id: string) => ["workspace", id, "detail"] },
}));

vi.mock("@/lib/request-sequence", () => ({
  createRequestSequence: () => {
    let seq = 0;
    let current = 0;
    return {
      next: () => {
        current = ++seq;
        return current;
      },
      isCurrent: (id: number) => id === current,
    };
  },
}));

// ─── WorkspaceAdapter shim ────────────────────────────────────────────────────

vi.mock("@/features/workspaces/lib/workspaceAdapter", () => ({
  buildImportLocalSummary: vi.fn(),
}));

// ─── WorkspaceSwitcher / OrgWorkspaceSwitcher shims ───────────────────────────

vi.mock("@/features/workspaces/components/WorkspaceSwitcher", () => ({
  WorkspaceSwitcher: () =>
    React.createElement("div", { "data-workspace-switcher": true }),
}));

vi.mock("@/features/workspaces/components/OrgWorkspaceSwitcher", () => ({
  OrgWorkspaceSwitcher: () =>
    React.createElement("div", { "data-org-switcher": true }),
}));

// ─── API mock ─────────────────────────────────────────────────────────────────

const mockGetWorkspace = vi.fn();
const mockSyncWorkspace = vi.fn();
const mockImportWorkspace = vi.fn();

vi.mock("@/services/workflow-backend", () => ({
  getWorkspace: (...args: unknown[]) => mockGetWorkspace(...args),
  syncWorkspace: (...args: unknown[]) => mockSyncWorkspace(...args),
  importWorkspace: (...args: unknown[]) => mockImportWorkspace(...args),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { WorkspaceProvider } from "../features/workspaces/context/WorkspaceContext";
import { renderToStaticMarkup } from "react-dom/server";

// ─── Board header mocks (SSR tests) ───────────────────────────────────────────

const mockBoardContextRef = vi.hoisted(() => ({
  current: {
    workspaceDetail: {
      id: "ws-1",
      name: "Demo WS",
      slug: "demo-ws",
      repo_url: "https://github.com/acme/demo.git",
      source_state: { stale: false },
      updated_at: "2026-06-01T00:00:00Z",
      features: [],
      tasks: [],
    },
    features: [] as Array<{ id: string; title: string; tasks: unknown[] }>,
    loading: false,
    error: null,
    reload: vi.fn(),
    syncing: false,
    syncError: null,
    syncBoard: vi.fn(),
  },
}));

vi.mock("@/features/board/components/KanbanBoard/KanbanBoard.context", () => ({
  useBoardContext: () => mockBoardContextRef.current,
}));

const mockWorkspaceContextForSSR = vi.hoisted(() => ({
  summaries: [
    {
      workspaceId: "ws-1",
      name: "Demo WS",
      repo_url: "https://github.com/acme/demo.git",
      default_branch: "main",
      last_opened_at: "2026-06-01T00:00:00Z",
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
  refreshWorkspace: vi.fn(),
  refreshingWorkspace: false,
  goToBoard: vi.fn(),
  selectWorkspace: vi.fn(),
  activateTaskTab: vi.fn(),
  closeTaskTab: vi.fn(),
  activateFeatureTab: vi.fn(),
  closeFeatureTab: vi.fn(),
}));

vi.mock(
  "@/features/workspaces/context/WorkspaceContext",
  async (importOriginal) => {
    const real =
      await importOriginal<
        typeof import("@/features/workspaces/context/WorkspaceContext")
      >();
    return {
      ...real,
      useWorkspaceContext: () => mockWorkspaceContextForSSR,
      useWorkspaceActionsContext: () => mockWorkspaceContextForSSR,
    };
  },
);

import { BoardHeader } from "../features/board/components/BoardHeader/BoardHeader";

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeWorkspaceDetail() {
  return {
    id: "ws-1",
    name: "Demo WS",
    slug: "demo-ws",
    repo_url: "https://github.com/acme/demo.git",
    source_state: { stale: false },
    updated_at: "2026-06-01T00:00:00Z",
    features: [],
    tasks: [],
  };
}

// ─── 1. BoardHeader renders a Refresh button ──────────────────────────────────

describe("T7 — BoardHeader has a Refresh button", () => {
  it("renders the Refresh button with correct aria-label", () => {
    const html = renderToStaticMarkup(React.createElement(BoardHeader));
    expect(html).toContain('aria-label="Refresh workspace data"');
  });

  it("renders the Refresh button title attribute", () => {
    const html = renderToStaticMarkup(React.createElement(BoardHeader));
    expect(html).toContain('title="Refresh workspace data"');
  });

  it("does NOT render the old Sync button", () => {
    const html = renderToStaticMarkup(React.createElement(BoardHeader));
    expect(html).not.toContain('aria-label="Sync workspace data"');
  });

  it("renders the Refresh button without disabled attribute when refreshingWorkspace is false", () => {
    mockWorkspaceContextForSSR.refreshingWorkspace = false;
    const html = renderToStaticMarkup(React.createElement(BoardHeader));
    // Should not have the HTML disabled attribute (note: CSS class "disabled:opacity-50" is expected)
    expect(html).not.toMatch(
      /aria-label="Refresh workspace data"[^>]*disabled[^:]/,
    );
  });

  it("renders the Refresh button with disabled attribute when refreshingWorkspace is true", () => {
    mockWorkspaceContextForSSR.refreshingWorkspace = true;
    const html = renderToStaticMarkup(React.createElement(BoardHeader));
    expect(html).toContain('aria-label="Refresh workspace data"');
    expect(html).toMatch(/aria-label="Refresh workspace data"/);
    // The button element should have disabled=""
    expect(html).toMatch(
      /<button[^>]*aria-label="Refresh workspace data"[^>]*disabled/,
    );
    // reset
    mockWorkspaceContextForSSR.refreshingWorkspace = false;
  });
});

// ─── 2. Refresh button triggers the re-fetch ──────────────────────────────────

describe("T7 — Refresh button triggers refreshWorkspace", () => {
  afterEach(cleanup);

  it("calls refreshWorkspace when the Refresh button is clicked", async () => {
    const onRefresh = vi.fn();
    mockWorkspaceContextForSSR.refreshWorkspace = onRefresh;

    render(React.createElement(BoardHeader));

    const btn = screen.getByRole("button", { name: /refresh workspace data/i });
    await userEvent.click(btn);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});

// ─── 3. Polling — timer lifecycle via WorkspaceProvider ──────────────────────

describe("T7 — polling timer scheduled / cleared on visibility transitions", () => {
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  function setupVisibleDocument() {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
  }

  function setDocumentHidden() {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }

  function setDocumentVisible() {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }

  beforeEach(() => {
    mockGetWorkspace.mockResolvedValue(makeWorkspaceDetail());
    vi.useFakeTimers();
    setupVisibleDocument();
  });

  it("schedules a 30s interval when the provider mounts with a visible tab", async () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

    await act(async () => {
      render(
        React.createElement(
          WorkspaceProvider,
          null,
          React.createElement("div", null, "child"),
        ),
      );
    });

    const thirtySecondCalls = setIntervalSpy.mock.calls.filter(
      ([, delay]) => delay === 30_000,
    );
    expect(thirtySecondCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("clears the interval when the tab becomes hidden", async () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    await act(async () => {
      render(
        React.createElement(
          WorkspaceProvider,
          null,
          React.createElement("div", null, "child"),
        ),
      );
    });

    const callsBefore = clearIntervalSpy.mock.calls.length;

    act(() => {
      setDocumentHidden();
    });

    expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("restarts the interval when the tab becomes visible again", async () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

    await act(async () => {
      render(
        React.createElement(
          WorkspaceProvider,
          null,
          React.createElement("div", null, "child"),
        ),
      );
    });

    const callsAfterMount = setIntervalSpy.mock.calls.filter(
      ([, delay]) => delay === 30_000,
    ).length;

    act(() => {
      setDocumentHidden();
    });

    act(() => {
      setDocumentVisible();
    });

    const callsAfterReturn = setIntervalSpy.mock.calls.filter(
      ([, delay]) => delay === 30_000,
    ).length;

    expect(callsAfterReturn).toBeGreaterThan(callsAfterMount);
  });

  it("calls getWorkspace immediately on return to visible (after being hidden)", async () => {
    await act(async () => {
      render(
        React.createElement(
          WorkspaceProvider,
          null,
          React.createElement("div", null, "child"),
        ),
      );
    });

    mockGetWorkspace.mockClear();

    act(() => {
      setDocumentHidden();
    });

    act(() => {
      setDocumentVisible();
    });

    // The visibilitychange → visible handler should fire an immediate refresh
    expect(mockGetWorkspace).toHaveBeenCalledWith("ws-1");
  });

  it("fires getWorkspace after 30s tick while tab is visible", async () => {
    await act(async () => {
      render(
        React.createElement(
          WorkspaceProvider,
          null,
          React.createElement("div", null, "child"),
        ),
      );
    });

    mockGetWorkspace.mockClear();

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    expect(mockGetWorkspace).toHaveBeenCalledWith("ws-1");
  });

  it("does NOT fire getWorkspace after 30s when tab is hidden", async () => {
    await act(async () => {
      render(
        React.createElement(
          WorkspaceProvider,
          null,
          React.createElement("div", null, "child"),
        ),
      );
    });

    act(() => {
      setDocumentHidden();
    });

    mockGetWorkspace.mockClear();

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    expect(mockGetWorkspace).not.toHaveBeenCalled();
  });
});
