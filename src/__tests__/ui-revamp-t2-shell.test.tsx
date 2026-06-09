/**
 * T2 — App shell: NavRail + Topbar + switcher + route group
 *
 * Covers:
 * - NavRail renders all nav items with correct routes
 * - NavRail marks active item based on pathname
 * - NavRail renders command palette trigger
 * - Topbar renders breadcrumb from pathname
 * - Topbar renders OrgWorkspaceSwitcher
 * - Topbar renders command palette button
 * - ShellLayout renders NavRail + Topbar + main slot
 * - Placeholder pages render for inbox, team, settings
 * - Board page works inside shell (data-board-page present)
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// ── Mock next/navigation ──────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/board"),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn(() => null) }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
    "aria-label": ariaLabel,
    "aria-current": ariaCurrent,
    "data-nav-item": dataNavItem,
    title,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    "aria-label"?: string;
    "aria-current"?: string;
    "data-nav-item"?: string;
    title?: string;
  }) =>
    React.createElement(
      "a",
      { href, className, "aria-label": ariaLabel, "aria-current": ariaCurrent, "data-nav-item": dataNavItem, title },
      children,
    ),
}));

// ── Mock auth ────────────────────────────────────────────────────────────────

vi.mock("@/features/auth", () => ({
  useSession: () => ({
    session: { status: "authenticated", data: { data: { user: { display_name: "Test" }, memberships: [], accessible_workspace_ids: [] } } },
    logout: vi.fn(),
  }),
}));

// ── Mock OrgWorkspaceSwitcher ────────────────────────────────────────────────

vi.mock("@/features/workspaces/components/OrgWorkspaceSwitcher", () => ({
  OrgWorkspaceSwitcher: () =>
    React.createElement("div", { "data-org-workspace-switcher": "" }),
}));

// ── Mock WorkspaceContext for board page ─────────────────────────────────────

const mockWorkspaceCtx = vi.hoisted(() => ({
  activeWorkspace: {
    id: "ws-1",
    name: "TestWS",
    slug: "test-ws",
    source_state: { stale: false },
    features: [],
    tasks: [],
  },
  loadingWorkspace: false,
  workspaceError: null,
  summaries: [{ workspaceId: "ws-1", name: "TestWS" }],
  openFeatureTabs: [],
  activeFeatureTabId: null,
  selectedWorkspaceId: "ws-1",
  goToBoard: vi.fn(),
  openTaskTab: vi.fn(),
  openFeatureTab: vi.fn(),
}));

vi.mock("@/features/workspaces/context/WorkspaceContext", () => ({
  useWorkspaceContext: () => mockWorkspaceCtx,
}));

vi.mock("@/features/board/components/BoardHeader/BoardHeader", () => ({
  BoardHeader: () => React.createElement("header", { "data-board-header": "" }),
}));

vi.mock("@/features/board/components/KanbanBoard/KanbanBoard.context", () => ({
  BoardProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-board-provider": "" }, children),
}));

vi.mock("@/features/board/components/KanbanBoard/KanbanBoard", () => ({
  KanbanBoard: () => React.createElement("div", { "data-kanban-board": "" }),
}));

vi.mock("@/features/board/components/TaskTrackingPanel/TaskTrackingPanel", () => ({
  TaskTrackingPanel: () =>
    React.createElement("aside", { "data-task-tracking-panel": "" }),
}));

vi.mock("@/features/agent-chat", () => ({
  AgentChatPanel: () => React.createElement("div", { "data-agent-chat-panel": "" }),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import { usePathname } from "next/navigation";
import { NavRail } from "../features/shell/components/NavRail";
import { Topbar } from "../features/shell/components/Topbar";
import ShellLayout from "../app/(shell)/layout";
import BoardPage from "../app/(shell)/board/page";
import InboxPage from "../app/(shell)/inbox/page";
import TeamPage from "../app/(shell)/team/page";
import SettingsPage from "../app/(shell)/settings/page";

// ── NavRail tests ─────────────────────────────────────────────────────────────

describe("NavRail", () => {
  it("renders all four nav items", () => {
    const html = renderToStaticMarkup(React.createElement(NavRail));
    expect(html).toContain('data-nav-item="board"');
    expect(html).toContain('data-nav-item="inbox"');
    expect(html).toContain('data-nav-item="team"');
    expect(html).toContain('data-nav-item="settings"');
  });

  it("links to correct hrefs", () => {
    const html = renderToStaticMarkup(React.createElement(NavRail));
    expect(html).toContain('href="/board"');
    expect(html).toContain('href="/inbox"');
    expect(html).toContain('href="/team"');
    expect(html).toContain('href="/settings"');
  });

  it("marks /board as active when pathname is /board", () => {
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/board");
    const html = renderToStaticMarkup(React.createElement(NavRail));
    expect(html).toMatch(/href="\/board"[^>]*aria-current="page"/);
  });

  it("marks /inbox as active when pathname is /inbox", () => {
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/inbox");
    const html = renderToStaticMarkup(React.createElement(NavRail));
    expect(html).toMatch(/href="\/inbox"[^>]*aria-current="page"/);
  });

  it("renders command palette trigger when handler is provided", () => {
    const html = renderToStaticMarkup(
      React.createElement(NavRail, { onCommandPalette: vi.fn() }),
    );
    expect(html).toContain('data-nav-command-palette');
  });

  it("has data-navrail attribute for test selection", () => {
    const html = renderToStaticMarkup(React.createElement(NavRail));
    expect(html).toContain("data-navrail");
  });
});

// ── Topbar tests ──────────────────────────────────────────────────────────────

describe("Topbar", () => {
  it("renders data-topbar attribute", () => {
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/board");
    const html = renderToStaticMarkup(React.createElement(Topbar));
    expect(html).toContain("data-topbar");
  });

  it("shows Board breadcrumb for /board", () => {
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/board");
    const html = renderToStaticMarkup(React.createElement(Topbar));
    expect(html).toContain("data-breadcrumb");
    expect(html).toContain("Board");
  });

  it("shows Inbox breadcrumb for /inbox", () => {
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/inbox");
    const html = renderToStaticMarkup(React.createElement(Topbar));
    expect(html).toContain("Inbox");
  });

  it("shows Team breadcrumb for /team", () => {
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/team");
    const html = renderToStaticMarkup(React.createElement(Topbar));
    expect(html).toContain("Team");
  });

  it("shows Settings breadcrumb for /settings", () => {
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/settings");
    const html = renderToStaticMarkup(React.createElement(Topbar));
    expect(html).toContain("Settings");
  });

  it("shows Feature IDE breadcrumb for /feature/* routes", () => {
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/feature/some-session-id");
    const html = renderToStaticMarkup(React.createElement(Topbar));
    expect(html).toContain("Feature IDE");
  });

  it("shows Task Review breadcrumb for /task/* routes", () => {
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/task/some-session-id");
    const html = renderToStaticMarkup(React.createElement(Topbar));
    expect(html).toContain("Task Review");
  });

  it("renders org/workspace switcher", () => {
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/board");
    const html = renderToStaticMarkup(React.createElement(Topbar));
    expect(html).toContain("data-org-workspace-switcher");
  });

  it("renders command palette button", () => {
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/board");
    const html = renderToStaticMarkup(React.createElement(Topbar));
    expect(html).toContain("data-topbar-command-palette");
  });

  it("renders logout button", () => {
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/board");
    const html = renderToStaticMarkup(React.createElement(Topbar));
    expect(html).toContain("data-topbar-logout");
  });
});

// ── ShellLayout tests ─────────────────────────────────────────────────────────

describe("ShellLayout", () => {
  it("renders data-shell-layout wrapper", () => {
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/board");
    const html = renderToStaticMarkup(
      React.createElement(ShellLayout, null,
        React.createElement("div", { "data-child": "" }),
      ),
    );
    expect(html).toContain("data-shell-layout");
  });

  it("renders NavRail inside the shell", () => {
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/board");
    const html = renderToStaticMarkup(
      React.createElement(ShellLayout, null,
        React.createElement("div", { "data-child": "" }),
      ),
    );
    expect(html).toContain("data-navrail");
  });

  it("renders Topbar inside the shell", () => {
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/board");
    const html = renderToStaticMarkup(
      React.createElement(ShellLayout, null,
        React.createElement("div", { "data-child": "" }),
      ),
    );
    expect(html).toContain("data-topbar");
  });

  it("renders children in the main slot", () => {
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/board");
    const html = renderToStaticMarkup(
      React.createElement(ShellLayout, null,
        React.createElement("div", { "data-test-child": "yes" }),
      ),
    );
    expect(html).toContain('data-test-child="yes"');
    expect(html).toContain("data-shell-main");
  });
});

// ── Placeholder pages ─────────────────────────────────────────────────────────

describe("InboxPage placeholder", () => {
  it("renders data-inbox-page", () => {
    const html = renderToStaticMarkup(React.createElement(InboxPage));
    expect(html).toContain("data-inbox-page");
  });
});

describe("TeamPage placeholder", () => {
  it("renders data-team-page", () => {
    const html = renderToStaticMarkup(React.createElement(TeamPage));
    expect(html).toContain("data-team-page");
  });
});

describe("SettingsPage placeholder", () => {
  it("renders data-settings-page", () => {
    const html = renderToStaticMarkup(React.createElement(SettingsPage));
    expect(html).toContain("data-settings-page");
  });
});

// ── BoardPage inside shell ────────────────────────────────────────────────────

describe("BoardPage (shell group)", () => {
  it("renders data-board-page", () => {
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/board");
    const html = renderToStaticMarkup(React.createElement(BoardPage));
    expect(html).toContain("data-board-page");
  });

  it("renders board components inside the shell slot", () => {
    const html = renderToStaticMarkup(React.createElement(BoardPage));
    expect(html).toContain("data-board-header");
    expect(html).toContain("data-kanban-board");
  });

  it("does not wrap in h-screen (layout provided by shell)", () => {
    const html = renderToStaticMarkup(React.createElement(BoardPage));
    expect(html).not.toMatch(/class="[^"]*h-screen/);
  });
});
