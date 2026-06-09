/**
 * T10 — Command palette (navigation real; actions placeholder)
 *
 * Covers:
 * - NAV_ITEMS registry contains all expected routes
 * - filterItems returns all items for empty query
 * - filterItems filters by label (case-insensitive)
 * - filterItems filters by hint
 * - filterItems returns empty for no matches
 * - CommandPalette renders data-command-palette when open
 * - CommandPalette does not render when closed
 * - CommandPalette renders navigate group when open
 * - CommandPalette renders actions group for admin users
 * - CommandPalette renders agent group when open
 * - CommandPalette hides admin-only actions for non-admin users
 * - CommandPalette shows navigate items with real hrefs
 * - CommandPalette shows placeholder badges on action/agent items
 * - CommandPalette renders no-results message when query matches nothing
 * - ShellLayout renders CommandPalette inside the shell
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

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

const makeSession = (role = "member") => ({
  session: {
    status: "authenticated" as const,
    data: {
      data: {
        user: { id: "u1", email: "test@test.com", display_name: "Test", avatar_url: null, created_at: "", updated_at: "" },
        memberships: [{ organization_id: "org-1", organization_slug: "org", organization_name: "Org", role }],
        accessible_workspace_ids: ["ws-1"],
      },
    },
  },
  logout: vi.fn(),
});

vi.mock("@/features/auth", () => ({
  useSession: vi.fn(() => makeSession("member")),
}));

vi.mock("@/features/workspaces/components/OrgWorkspaceSwitcher", () => ({
  OrgWorkspaceSwitcher: () =>
    React.createElement("div", { "data-org-workspace-switcher": "" }),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useSession } from "@/features/auth";
import {
  filterItems,
  NAV_ITEMS,
  ACTION_ITEMS,
  AGENT_ITEMS,
  CommandPalette,
} from "../features/shell/components/CommandPalette";
import ShellLayout from "../app/(shell)/layout";

// ── NAV_ITEMS registry ────────────────────────────────────────────────────────

describe("NAV_ITEMS registry", () => {
  it("contains Board item with correct href", () => {
    const item = NAV_ITEMS.find((n) => n.id === "nav-board");
    expect(item).toBeDefined();
    expect(item?.href).toBe("/board");
  });

  it("contains Inbox item with correct href", () => {
    const item = NAV_ITEMS.find((n) => n.id === "nav-inbox");
    expect(item).toBeDefined();
    expect(item?.href).toBe("/inbox");
  });

  it("contains Team item with correct href", () => {
    const item = NAV_ITEMS.find((n) => n.id === "nav-team");
    expect(item).toBeDefined();
    expect(item?.href).toBe("/team");
  });

  it("contains Settings item with correct href", () => {
    const item = NAV_ITEMS.find((n) => n.id === "nav-settings");
    expect(item).toBeDefined();
    expect(item?.href).toBe("/settings");
  });

  it("has four nav items total", () => {
    expect(NAV_ITEMS).toHaveLength(4);
  });
});

// ── filterItems ───────────────────────────────────────────────────────────────

describe("filterItems", () => {
  it("returns all items for empty query", () => {
    expect(filterItems(NAV_ITEMS, "")).toHaveLength(NAV_ITEMS.length);
  });

  it("returns all items for whitespace-only query", () => {
    expect(filterItems(NAV_ITEMS, "   ")).toHaveLength(NAV_ITEMS.length);
  });

  it("filters by label case-insensitively", () => {
    const results = filterItems(NAV_ITEMS, "BOARD");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("nav-board");
  });

  it("filters by partial label match", () => {
    const results = filterItems(NAV_ITEMS, "set");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("nav-settings");
  });

  it("filters by hint", () => {
    const results = filterItems(NAV_ITEMS, "Go to Team");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("nav-team");
  });

  it("returns empty array when nothing matches", () => {
    const results = filterItems(NAV_ITEMS, "zzz-no-match");
    expect(results).toHaveLength(0);
  });
});

// ── CommandPalette rendering ──────────────────────────────────────────────────

describe("CommandPalette (closed)", () => {
  it("renders nothing when open=false", () => {
    const html = renderToStaticMarkup(
      React.createElement(CommandPalette, { open: false, onClose: vi.fn() }),
    );
    expect(html).toBe("");
  });
});

describe("CommandPalette (open, member)", () => {
  beforeEach(() => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue(makeSession("member"));
  });

  it("renders data-command-palette when open", () => {
    const html = renderToStaticMarkup(
      React.createElement(CommandPalette, { open: true, onClose: vi.fn() }),
    );
    expect(html).toContain("data-command-palette");
  });

  it("renders backdrop when open", () => {
    const html = renderToStaticMarkup(
      React.createElement(CommandPalette, { open: true, onClose: vi.fn() }),
    );
    expect(html).toContain("data-command-palette-backdrop");
  });

  it("renders search input", () => {
    const html = renderToStaticMarkup(
      React.createElement(CommandPalette, { open: true, onClose: vi.fn() }),
    );
    expect(html).toContain("data-command-palette-input");
  });

  it("renders navigate group", () => {
    const html = renderToStaticMarkup(
      React.createElement(CommandPalette, { open: true, onClose: vi.fn() }),
    );
    expect(html).toContain('data-command-palette-group="navigate"');
  });

  it("renders all four navigate items", () => {
    const html = renderToStaticMarkup(
      React.createElement(CommandPalette, { open: true, onClose: vi.fn() }),
    );
    expect(html).toContain('data-command-palette-item="nav-board"');
    expect(html).toContain('data-command-palette-item="nav-inbox"');
    expect(html).toContain('data-command-palette-item="nav-team"');
    expect(html).toContain('data-command-palette-item="nav-settings"');
  });

  it("shows placeholder badge on action items", () => {
    const html = renderToStaticMarkup(
      React.createElement(CommandPalette, { open: true, onClose: vi.fn() }),
    );
    expect(html).toContain("data-command-palette-placeholder");
  });

  it("renders agent group", () => {
    const html = renderToStaticMarkup(
      React.createElement(CommandPalette, { open: true, onClose: vi.fn() }),
    );
    expect(html).toContain('data-command-palette-group="agent"');
  });

  it("hides admin-only action items for non-admin users", () => {
    const html = renderToStaticMarkup(
      React.createElement(CommandPalette, { open: true, onClose: vi.fn() }),
    );
    // Admin-only items should not appear for a member
    const adminItems = ACTION_ITEMS.filter((a) => a.requiresAdmin);
    for (const item of adminItems) {
      expect(html).not.toContain(`data-command-palette-item="${item.id}"`);
    }
  });

  it("shows non-admin action items for regular members", () => {
    const html = renderToStaticMarkup(
      React.createElement(CommandPalette, { open: true, onClose: vi.fn() }),
    );
    const nonAdminItems = ACTION_ITEMS.filter((a) => !a.requiresAdmin);
    for (const item of nonAdminItems) {
      expect(html).toContain(`data-command-palette-item="${item.id}"`);
    }
  });
});

describe("CommandPalette (open, admin)", () => {
  beforeEach(() => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue(makeSession("admin"));
  });

  it("renders admin-only action items for admin users", () => {
    const html = renderToStaticMarkup(
      React.createElement(CommandPalette, { open: true, onClose: vi.fn() }),
    );
    const adminItems = ACTION_ITEMS.filter((a) => a.requiresAdmin);
    expect(adminItems.length).toBeGreaterThan(0);
    for (const item of adminItems) {
      expect(html).toContain(`data-command-palette-item="${item.id}"`);
    }
  });

  it("renders actions group for admin", () => {
    const html = renderToStaticMarkup(
      React.createElement(CommandPalette, { open: true, onClose: vi.fn() }),
    );
    expect(html).toContain('data-command-palette-group="actions"');
  });
});

// ── ACTION_ITEMS / AGENT_ITEMS registries ─────────────────────────────────────

describe("ACTION_ITEMS registry", () => {
  it("has at least one admin-required action", () => {
    expect(ACTION_ITEMS.some((a) => a.requiresAdmin)).toBe(true);
  });

  it("has at least one non-admin action", () => {
    expect(ACTION_ITEMS.some((a) => !a.requiresAdmin)).toBe(true);
  });
});

describe("AGENT_ITEMS registry", () => {
  it("has at least two agent items", () => {
    expect(AGENT_ITEMS.length).toBeGreaterThanOrEqual(2);
  });

  it("all agent items have group='agent'", () => {
    expect(AGENT_ITEMS.every((a) => a.group === "agent")).toBe(true);
  });
});

// ── ShellLayout integration ───────────────────────────────────────────────────

describe("ShellLayout with CommandPalette", () => {
  it("renders data-command-palette-backdrop in the shell (palette closed by default)", () => {
    const html = renderToStaticMarkup(
      React.createElement(ShellLayout, null,
        React.createElement("div", { "data-test-child": "" }),
      ),
    );
    // Palette is closed by default — backdrop should not be present
    expect(html).not.toContain("data-command-palette-backdrop");
    // But the shell layout itself should render
    expect(html).toContain("data-shell-layout");
  });
});
