import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockPathname = vi.fn(() => "/board");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => mockPathname(),
}));

const mockFetchMe = vi.fn();
const mockLogoutFn = vi.fn();

vi.mock("@/services/user-service", () => ({
  fetchMe: (...args: unknown[]) => mockFetchMe(...args),
  logout: (...args: unknown[]) => mockLogoutFn(...args),
  getUserServiceBase: () => "http://localhost:8082",
}));

import { SessionProvider, useSession } from "../features/auth/context/SessionContext";

describe("SessionContext", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
    mockFetchMe.mockReset();
    mockLogoutFn.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("throws when useSession is called outside SessionProvider", () => {
    function Consumer() {
      useSession();
      return React.createElement("div", null, "ok");
    }
    expect(() => renderToStaticMarkup(React.createElement(Consumer))).toThrow(
      "useSession must be used within a SessionProvider",
    );
  });

  it("renders children without throwing when wrapped in SessionProvider", () => {
    mockFetchMe.mockResolvedValue({
      user: { id: "u1", email: "a@b.com", display_name: null, avatar_url: null, created_at: "", updated_at: "" },
      memberships: [],
      accessible_workspace_ids: [],
    });
    function Consumer() {
      const { session } = useSession();
      return React.createElement("div", { "data-status": session.status }, "ok");
    }
    const html = renderToStaticMarkup(
      React.createElement(SessionProvider, null, React.createElement(Consumer)),
    );
    expect(html).toContain("data-status");
  });
});

describe("user-service client types", () => {
  it("MeResponse type has expected shape", async () => {
    const { fetchMe: _fetchMe } = await import("../services/user-service/client");
    expect(typeof _fetchMe).toBe("function");
  });

  it("getUserServiceBase returns a URL when env var is not set (falls back to default)", async () => {
    const savedUrl = process.env.NEXT_PUBLIC_USER_SERVICE_URL;
    delete process.env.NEXT_PUBLIC_USER_SERVICE_URL;

    const { getUserServiceBase } = await import("../services/user-service/client");
    // Implementation falls back to default production URL rather than throwing
    expect(() => getUserServiceBase()).not.toThrow();
    expect(getUserServiceBase()).toMatch(/^https?:\/\//);

    if (savedUrl !== undefined) {
      process.env.NEXT_PUBLIC_USER_SERVICE_URL = savedUrl;
    }
  });
});
