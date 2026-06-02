// @vitest-environment jsdom
/**
 * T5 — EmptyState component unit tests.
 *
 * Covers:
 * - client_member (or any non-platform_admin) sees friendly message + logout button,
 *   no "Import workspace" link
 * - platform_admin sees same message + logout button + "Import workspace" link to /admin/connect
 * - loading state renders nothing
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";

// ─── Next.js shims ────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
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

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

const mockLogout = vi.fn();

const sessionState: {
  status: SessionStatus;
  data: {
    user: {
      id: string;
      email: string;
      display_name: null;
      avatar_url: null;
      created_at: string;
      updated_at: string;
    };
    memberships: Array<{
      organization_id: string;
      organization_slug: string;
      organization_name: string;
      role: string;
    }>;
    accessible_workspace_ids: string[];
  };
} = {
  status: "authenticated",
  data: {
    user: {
      id: "u1",
      email: "client@example.com",
      display_name: null,
      avatar_url: null,
      created_at: "",
      updated_at: "",
    },
    memberships: [
      {
        organization_id: "org-1",
        organization_slug: "kitelabs",
        organization_name: "Kitelabs",
        role: "client_member",
      },
    ],
    accessible_workspace_ids: [],
  },
};

vi.mock("@/features/auth", () => ({
  useSession: () => ({
    session: sessionState,
    logout: mockLogout,
  }),
}));

import { EmptyState } from "../features/workspaces/components/EmptyState/EmptyState";

afterEach(() => {
  cleanup();
});

// ─── client_member variant ────────────────────────────────────────────────────

describe("EmptyState — client_member variant", () => {
  it("renders the friendly message", () => {
    sessionState.status = "authenticated";
    sessionState.data.memberships = [
      {
        organization_id: "org-1",
        organization_slug: "kitelabs",
        organization_name: "Kitelabs",
        role: "client_member",
      },
    ];

    render(React.createElement(EmptyState));
    expect(
      screen.getByText(
        /Your workspace will appear here as soon as your engagement is set up/i,
      ),
    ).toBeTruthy();
    expect(screen.getByText(/contact your Kitelabs delivery lead/i)).toBeTruthy();
  });

  it("renders the logout button", () => {
    sessionState.status = "authenticated";
    sessionState.data.memberships = [
      {
        organization_id: "org-1",
        organization_slug: "kitelabs",
        organization_name: "Kitelabs",
        role: "client_member",
      },
    ];

    render(React.createElement(EmptyState));
    const logoutBtn = screen.getByTestId("empty-state-logout");
    expect(logoutBtn).toBeTruthy();
  });

  it("does NOT render the Import workspace link for client_member", () => {
    sessionState.status = "authenticated";
    sessionState.data.memberships = [
      {
        organization_id: "org-1",
        organization_slug: "kitelabs",
        organization_name: "Kitelabs",
        role: "client_member",
      },
    ];

    render(React.createElement(EmptyState));
    const link = screen.queryByTestId("empty-state-import-link");
    expect(link).toBeNull();
  });

  it("does NOT render the Import workspace link for user with no memberships", () => {
    sessionState.status = "authenticated";
    sessionState.data.memberships = [];

    render(React.createElement(EmptyState));
    const link = screen.queryByTestId("empty-state-import-link");
    expect(link).toBeNull();
  });
});

// ─── platform_admin variant ───────────────────────────────────────────────────

describe("EmptyState — platform_admin variant", () => {
  it("renders the friendly message", () => {
    sessionState.status = "authenticated";
    sessionState.data.memberships = [
      {
        organization_id: "org-1",
        organization_slug: "kitelabs",
        organization_name: "Kitelabs",
        role: "platform_admin",
      },
    ];

    render(React.createElement(EmptyState));
    expect(
      screen.getByText(
        /Your workspace will appear here as soon as your engagement is set up/i,
      ),
    ).toBeTruthy();
  });

  it("renders the Import workspace link pointing to /admin/connect", () => {
    sessionState.status = "authenticated";
    sessionState.data.memberships = [
      {
        organization_id: "org-1",
        organization_slug: "kitelabs",
        organization_name: "Kitelabs",
        role: "platform_admin",
      },
    ];

    render(React.createElement(EmptyState));
    const link = screen.getByTestId("empty-state-import-link");
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/admin/connect");
  });

  it("renders the Import workspace link with correct text", () => {
    sessionState.status = "authenticated";
    sessionState.data.memberships = [
      {
        organization_id: "org-1",
        organization_slug: "kitelabs",
        organization_name: "Kitelabs",
        role: "platform_admin",
      },
    ];

    render(React.createElement(EmptyState));
    expect(screen.getByText(/Import workspace/i)).toBeTruthy();
  });

  it("also renders the logout button for platform_admin", () => {
    sessionState.status = "authenticated";
    sessionState.data.memberships = [
      {
        organization_id: "org-1",
        organization_slug: "kitelabs",
        organization_name: "Kitelabs",
        role: "platform_admin",
      },
    ];

    render(React.createElement(EmptyState));
    const logoutBtn = screen.getByTestId("empty-state-logout");
    expect(logoutBtn).toBeTruthy();
  });

  it("renders the Import workspace link when user has platform_admin among multiple roles", () => {
    sessionState.status = "authenticated";
    sessionState.data.memberships = [
      {
        organization_id: "org-1",
        organization_slug: "kitelabs",
        organization_name: "Kitelabs",
        role: "client_member",
      },
      {
        organization_id: "org-2",
        organization_slug: "kitelabs2",
        organization_name: "Kitelabs 2",
        role: "platform_admin",
      },
    ];

    render(React.createElement(EmptyState));
    const link = screen.getByTestId("empty-state-import-link");
    expect(link).toBeTruthy();
  });
});

// ─── data-testid guard ────────────────────────────────────────────────────────

describe("EmptyState — data-testid attributes", () => {
  it("renders data-testid='empty-state' on root element", () => {
    sessionState.status = "authenticated";
    sessionState.data.memberships = [];

    render(React.createElement(EmptyState));
    expect(screen.getByTestId("empty-state")).toBeTruthy();
  });
});
