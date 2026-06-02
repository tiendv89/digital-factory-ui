// @vitest-environment jsdom
/**
 * T4 — AdminLayout guard unit tests.
 *
 * Verifies that the /admin/* layout:
 * - renders children for platform_admin members
 * - calls notFound() for client_member (no platform_admin role)
 * - calls notFound() when session is unauthenticated
 * - shows a loading spinner while session is loading
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";

const mockNotFound = vi.fn();

vi.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/connect",
}));

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

const sessionState = vi.hoisted(() => ({
  status: "authenticated" as SessionStatus,
  data: {
    user: {
      id: "u1",
      email: "admin@example.com",
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
        role: "platform_admin",
      },
    ],
    accessible_workspace_ids: [],
  },
}));

vi.mock("@/features/auth", () => ({
  useSession: () => ({
    session: sessionState,
    logout: vi.fn(),
  }),
}));

import AdminLayout from "../app/admin/layout";

describe("AdminLayout guard", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockNotFound.mockReset();
    sessionState.status = "authenticated";
    sessionState.data.memberships = [
      {
        organization_id: "org-1",
        organization_slug: "kitelabs",
        organization_name: "Kitelabs",
        role: "platform_admin",
      },
    ];
  });

  it("renders children for a platform_admin member", () => {
    render(
      React.createElement(
        AdminLayout,
        null,
        React.createElement("div", { "data-testid": "child" }, "admin content"),
      ),
    );
    expect(screen.getByTestId("child")).toBeTruthy();
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it("calls notFound() for a client_member (no platform_admin role)", () => {
    sessionState.data.memberships = [
      {
        organization_id: "org-1",
        organization_slug: "kitelabs",
        organization_name: "Kitelabs",
        role: "client_member",
      },
    ];
    render(
      React.createElement(
        AdminLayout,
        null,
        React.createElement("div", { "data-testid": "child" }, "admin content"),
      ),
    );
    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it("calls notFound() when user has no memberships", () => {
    sessionState.data.memberships = [];
    render(
      React.createElement(
        AdminLayout,
        null,
        React.createElement("div", { "data-testid": "child" }, "admin content"),
      ),
    );
    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it("calls notFound() when session is unauthenticated", () => {
    (sessionState as { status: SessionStatus }).status = "unauthenticated";
    render(
      React.createElement(
        AdminLayout,
        null,
        React.createElement("div", { "data-testid": "child" }, "admin content"),
      ),
    );
    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it("shows a loading spinner while session is loading", () => {
    (sessionState as { status: SessionStatus }).status = "loading";
    const { container } = render(
      React.createElement(
        AdminLayout,
        null,
        React.createElement("div", { "data-testid": "child" }, "admin content"),
      ),
    );
    expect(container.querySelector(".animate-spin")).toBeTruthy();
    expect(mockNotFound).not.toHaveBeenCalled();
    expect(screen.queryByTestId("child")).toBeNull();
  });
});
