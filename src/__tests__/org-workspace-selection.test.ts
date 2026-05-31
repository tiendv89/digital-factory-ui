// @vitest-environment jsdom
/**
 * T5 — useOrgWorkspaceSelection hook unit tests.
 *
 * Tests:
 * - Returns active membership from URL param ?org= (or first if absent)
 * - Returns active workspace ID from URL param ?ws= (or first if absent)
 * - switchOrg updates URL with ?org=slug and removes ?ws=
 * - switchWorkspace updates URL with ?ws=id and sets ?org= from active membership
 * - isEmpty true when authenticated + 0 memberships
 * - isLoading true when session is loading
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock searchParams state ──────────────────────────────────────────────────

const searchParamsStore: Record<string, string> = {};
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  useSearchParams: () => ({
    get: (key: string) => searchParamsStore[key] ?? null,
    toString: () =>
      Object.entries(searchParamsStore)
        .map(([k, v]) => `${k}=${v}`)
        .join("&"),
  }),
  usePathname: () => "/board",
}));

// ─── Mock session ─────────────────────────────────────────────────────────────

const sessionState = vi.hoisted(() => ({
  status: "authenticated" as "loading" | "authenticated" | "unauthenticated",
  data: {
    user: {
      id: "u1",
      email: "user@example.com",
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
    accessible_workspace_ids: ["ws-1", "ws-2"],
  },
}));

vi.mock("@/features/auth", () => ({
  useSession: () => ({
    session: sessionState,
    logout: vi.fn(),
  }),
}));

// ─── Import hook ──────────────────────────────────────────────────────────────

import { renderHook } from "@testing-library/react";
import { useOrgWorkspaceSelection } from "../features/workspaces/hooks/useOrgWorkspaceSelection";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useOrgWorkspaceSelection — defaults (no URL params)", () => {
  beforeEach(() => {
    // clear search params
    for (const k of Object.keys(searchParamsStore)) delete searchParamsStore[k];
    sessionState.status = "authenticated";
    sessionState.data = {
      user: {
        id: "u1",
        email: "user@example.com",
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
      accessible_workspace_ids: ["ws-1", "ws-2"],
    };
    mockPush.mockReset();
  });

  it("returns first membership as activeMembership when no org param", () => {
    const { result } = renderHook(() => useOrgWorkspaceSelection());
    expect(result.current.activeMembership?.organization_slug).toBe("kitelabs");
  });

  it("returns first accessible workspace as activeWorkspaceId when no ws param", () => {
    const { result } = renderHook(() => useOrgWorkspaceSelection());
    expect(result.current.activeWorkspaceId).toBe("ws-1");
  });

  it("returns all memberships", () => {
    const { result } = renderHook(() => useOrgWorkspaceSelection());
    expect(result.current.memberships).toHaveLength(1);
  });

  it("returns all accessible workspace IDs", () => {
    const { result } = renderHook(() => useOrgWorkspaceSelection());
    expect(result.current.accessibleWorkspaceIds).toEqual(["ws-1", "ws-2"]);
  });

  it("isEmpty is false when authenticated with memberships", () => {
    const { result } = renderHook(() => useOrgWorkspaceSelection());
    expect(result.current.isEmpty).toBe(false);
  });

  it("isLoading is false when session is authenticated", () => {
    const { result } = renderHook(() => useOrgWorkspaceSelection());
    expect(result.current.isLoading).toBe(false);
  });
});

describe("useOrgWorkspaceSelection — URL param ?org=", () => {
  beforeEach(() => {
    for (const k of Object.keys(searchParamsStore)) delete searchParamsStore[k];
    sessionState.status = "authenticated";
    sessionState.data = {
      user: {
        id: "u1",
        email: "user@example.com",
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
        {
          organization_id: "org-2",
          organization_slug: "acme",
          organization_name: "Acme",
          role: "client_member",
        },
      ],
      accessible_workspace_ids: ["ws-1"],
    };
    mockPush.mockReset();
  });

  it("uses ?org= param to set activeMembership", () => {
    searchParamsStore["org"] = "acme";
    const { result } = renderHook(() => useOrgWorkspaceSelection());
    expect(result.current.activeMembership?.organization_slug).toBe("acme");
  });

  it("falls back to first membership when ?org= does not match", () => {
    searchParamsStore["org"] = "unknown-org";
    const { result } = renderHook(() => useOrgWorkspaceSelection());
    expect(result.current.activeMembership?.organization_slug).toBe("kitelabs");
  });
});

describe("useOrgWorkspaceSelection — URL param ?ws=", () => {
  beforeEach(() => {
    for (const k of Object.keys(searchParamsStore)) delete searchParamsStore[k];
    sessionState.status = "authenticated";
    sessionState.data = {
      user: {
        id: "u1",
        email: "user@example.com",
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
      accessible_workspace_ids: ["ws-1", "ws-2"],
    };
    mockPush.mockReset();
  });

  it("uses ?ws= param to set activeWorkspaceId when it is in accessible list", () => {
    searchParamsStore["ws"] = "ws-2";
    const { result } = renderHook(() => useOrgWorkspaceSelection());
    expect(result.current.activeWorkspaceId).toBe("ws-2");
  });

  it("falls back to first when ?ws= is not in accessible_workspace_ids", () => {
    searchParamsStore["ws"] = "not-accessible";
    const { result } = renderHook(() => useOrgWorkspaceSelection());
    expect(result.current.activeWorkspaceId).toBe("ws-1");
  });
});

describe("useOrgWorkspaceSelection — switchOrg", () => {
  beforeEach(() => {
    for (const k of Object.keys(searchParamsStore)) delete searchParamsStore[k];
    sessionState.status = "authenticated";
    sessionState.data = {
      user: {
        id: "u1",
        email: "user@example.com",
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
      accessible_workspace_ids: ["ws-1"],
    };
    mockPush.mockReset();
  });

  it("calls router.push with ?org=<newSlug> and no ?ws=", () => {
    const { result } = renderHook(() => useOrgWorkspaceSelection());
    result.current.switchOrg("new-org");
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("org=new-org"));
    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("ws=");
  });
});

describe("useOrgWorkspaceSelection — switchWorkspace", () => {
  beforeEach(() => {
    for (const k of Object.keys(searchParamsStore)) delete searchParamsStore[k];
    sessionState.status = "authenticated";
    sessionState.data = {
      user: {
        id: "u1",
        email: "user@example.com",
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
      accessible_workspace_ids: ["ws-1", "ws-2"],
    };
    mockPush.mockReset();
  });

  it("calls router.push with ?ws=<id> and includes org param", () => {
    const { result } = renderHook(() => useOrgWorkspaceSelection());
    result.current.switchWorkspace("ws-2");
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("ws=ws-2"));
    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).toContain("org=kitelabs");
  });
});

describe("useOrgWorkspaceSelection — loading state", () => {
  it("isLoading is true when session status is loading", () => {
    sessionState.status = "loading";
    const { result } = renderHook(() => useOrgWorkspaceSelection());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.memberships).toHaveLength(0);
    expect(result.current.accessibleWorkspaceIds).toHaveLength(0);
  });
});

describe("useOrgWorkspaceSelection — empty state", () => {
  beforeEach(() => {
    for (const k of Object.keys(searchParamsStore)) delete searchParamsStore[k];
    sessionState.status = "authenticated";
    sessionState.data = {
      user: {
        id: "u1",
        email: "user@example.com",
        display_name: null,
        avatar_url: null,
        created_at: "",
        updated_at: "",
      },
      memberships: [],
      accessible_workspace_ids: [],
    };
    mockPush.mockReset();
  });

  it("isEmpty is true when authenticated with 0 memberships", () => {
    const { result } = renderHook(() => useOrgWorkspaceSelection());
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("activeMembership is null when no memberships", () => {
    const { result } = renderHook(() => useOrgWorkspaceSelection());
    expect(result.current.activeMembership).toBeNull();
  });

  it("activeWorkspaceId is null when no accessible workspace IDs", () => {
    const { result } = renderHook(() => useOrgWorkspaceSelection());
    expect(result.current.activeWorkspaceId).toBeNull();
  });
});
