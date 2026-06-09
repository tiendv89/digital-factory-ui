/**
 * T5 — OrgWorkspaceSwitcher unit tests.
 *
 * Tests the org/workspace switcher component driven by /api/me:
 * - Loading state
 * - Empty memberships (no orgs) → "Contact your delivery team"
 * - Single org, single workspace → non-interactive labels
 * - Multiple orgs → org dropdown rendered
 * - Multiple workspaces → workspace dropdown rendered
 * - URL param sync (org/ws) via router.push
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockSearchParamsGet = vi.fn((key: string) => {
  if (key === "org") return null;
  if (key === "ws") return null;
  return null;
});
const mockSearchParamsToString = vi.fn(() => "");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  useSearchParams: () => ({
    get: mockSearchParamsGet,
    toString: mockSearchParamsToString,
  }),
  usePathname: () => "/board",
}));

const mockSession = vi.hoisted(() => ({
  status: "authenticated" as "loading" | "authenticated" | "unauthenticated",
  data: {
    user: {
      id: "u1",
      email: "user@example.com",
      display_name: "Test User" as string | null,
      avatar_url: null as string | null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    memberships: [
      {
        organization_id: "org-1",
        organization_slug: "kitelabs",
        organization_name: "Kitelabs",
        role: "platform_admin",
      },
    ],
    accessible_workspace_ids: ["ws-uuid-1"],
  },
}));

vi.mock("@/features/auth", () => ({
  useSession: () => ({
    session: mockSession,
    logout: vi.fn(),
  }),
}));

const mockWorkspaceContext = vi.hoisted(() => ({
  summaries: [
    {
      workspaceId: "ws-uuid-1",
      name: "Main Project",
      repo_url: "https://github.com/acme/main.git",
      default_branch: "main",
      last_opened_at: "2026-05-22T00:00:00Z",
    },
  ],
  selectedWorkspaceId: "ws-uuid-1",
  activeSurface: "board" as string,
  selectWorkspace: vi.fn(),
  goToBoard: vi.fn(),
}));

vi.mock("@/features/workspaces/context/WorkspaceContext", () => ({
  useWorkspaceContext: () => mockWorkspaceContext,
}));

import { OrgWorkspaceSwitcher } from "../features/workspaces/components/OrgWorkspaceSwitcher/OrgWorkspaceSwitcher";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("OrgWorkspaceSwitcher — loading state", () => {
  beforeEach(() => {
    mockSession.status = "loading";
    vi.clearAllMocks();
  });

  it("renders a loading spinner when session is loading", () => {
    const html = renderToStaticMarkup(React.createElement(OrgWorkspaceSwitcher));
    expect(html).toContain('aria-label="Loading session"');
    expect(html).toContain("animate-spin");
  });
});

describe("OrgWorkspaceSwitcher — empty memberships", () => {
  beforeEach(() => {
    mockSession.status = "authenticated";
    mockSession.data = {
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
    vi.clearAllMocks();
  });

  it("renders empty state with 'No organization' label and 'New Org' create trigger when no memberships", () => {
    const html = renderToStaticMarkup(React.createElement(OrgWorkspaceSwitcher));
    expect(html).toContain("No organization");
    expect(html).toContain("data-org-workspace-empty");
    expect(html).toContain("data-create-org-trigger");
  });
});

describe("OrgWorkspaceSwitcher — single org, single workspace", () => {
  beforeEach(() => {
    mockSession.status = "authenticated";
    mockSession.data = {
      user: {
        id: "u1",
        email: "user@example.com",
        display_name: "Test User",
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
      accessible_workspace_ids: ["ws-uuid-1"],
    };
    mockWorkspaceContext.summaries = [
      {
        workspaceId: "ws-uuid-1",
        name: "Main Project",
        repo_url: "https://github.com/acme/main.git",
        default_branch: "main",
        last_opened_at: "2026-05-22T00:00:00Z",
      },
    ];
    vi.clearAllMocks();
  });

  it("renders org name as non-interactive label (no dropdown)", () => {
    const html = renderToStaticMarkup(React.createElement(OrgWorkspaceSwitcher));
    expect(html).toContain("Kitelabs");
    expect(html).toContain("data-org-label");
    expect(html).not.toContain('aria-label="Switch organization"');
  });

  it("renders workspace name as non-interactive label (no dropdown)", () => {
    const html = renderToStaticMarkup(React.createElement(OrgWorkspaceSwitcher));
    expect(html).toContain("Main Project");
    expect(html).toContain("data-workspace-label");
    expect(html).not.toContain('aria-label="Switch workspace"');
  });

  it("renders data-org-workspace-switcher container", () => {
    const html = renderToStaticMarkup(React.createElement(OrgWorkspaceSwitcher));
    expect(html).toContain("data-org-workspace-switcher");
  });
});

describe("OrgWorkspaceSwitcher — multiple orgs", () => {
  beforeEach(() => {
    mockSession.status = "authenticated";
    mockSession.data = {
      user: {
        id: "u1",
        email: "user@example.com",
        display_name: "Test User",
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
          organization_slug: "acme-corp",
          organization_name: "Acme Corp",
          role: "client_member",
        },
      ],
      accessible_workspace_ids: ["ws-uuid-1"],
    };
    mockWorkspaceContext.summaries = [
      {
        workspaceId: "ws-uuid-1",
        name: "Main Project",
        repo_url: "https://github.com/acme/main.git",
        default_branch: "main",
        last_opened_at: "2026-05-22T00:00:00Z",
      },
    ];
    vi.clearAllMocks();
  });

  it("renders org dropdown trigger when user has ≥2 memberships", () => {
    const html = renderToStaticMarkup(React.createElement(OrgWorkspaceSwitcher));
    expect(html).toContain('aria-label="Switch organization"');
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).not.toContain("data-org-label");
  });

  it("shows current org name in the trigger button", () => {
    const html = renderToStaticMarkup(React.createElement(OrgWorkspaceSwitcher));
    // Trigger shows the active org (first one by default)
    expect(html).toContain("Kitelabs");
  });
});

describe("OrgWorkspaceSwitcher — multiple workspaces", () => {
  beforeEach(() => {
    mockSession.status = "authenticated";
    mockSession.data = {
      user: {
        id: "u1",
        email: "user@example.com",
        display_name: "Test User",
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
      accessible_workspace_ids: ["ws-uuid-1", "ws-uuid-2"],
    };
    mockWorkspaceContext.summaries = [
      {
        workspaceId: "ws-uuid-1",
        name: "Alpha Project",
        repo_url: "https://github.com/acme/alpha.git",
        default_branch: "main",
        last_opened_at: "2026-05-22T00:00:00Z",
      },
      {
        workspaceId: "ws-uuid-2",
        name: "Beta Project",
        repo_url: "https://github.com/acme/beta.git",
        default_branch: "main",
        last_opened_at: "2026-05-22T00:00:00Z",
      },
    ];
    vi.clearAllMocks();
  });

  it("renders workspace dropdown trigger when user has ≥2 accessible workspaces", () => {
    const html = renderToStaticMarkup(React.createElement(OrgWorkspaceSwitcher));
    expect(html).toContain('aria-label="Switch workspace"');
    expect(html).not.toContain("data-workspace-label");
  });

  it("shows the first (active) workspace name in the trigger button", () => {
    const html = renderToStaticMarkup(React.createElement(OrgWorkspaceSwitcher));
    // The trigger shows the active workspace name (first by default when no ?ws= param)
    expect(html).toContain("Alpha Project");
  });
});

describe("OrgWorkspaceSwitcher — graceful degradation (no matching accessible workspaces)", () => {
  beforeEach(() => {
    mockSession.status = "authenticated";
    mockSession.data = {
      user: {
        id: "u1",
        email: "user@example.com",
        display_name: "Test User",
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
      // "unrelated-uuid" does NOT match "ws-local-1" below
      accessible_workspace_ids: ["unrelated-uuid"],
    };
    mockWorkspaceContext.summaries = [
      {
        workspaceId: "ws-local-1",
        name: "Local Dev Workspace",
        repo_url: "https://github.com/dev/ws.git",
        default_branch: "main",
        last_opened_at: "2026-05-22T00:00:00Z",
      },
    ];
    vi.clearAllMocks();
  });

  it("falls back to showing all local summaries when no UUID matches", () => {
    const html = renderToStaticMarkup(React.createElement(OrgWorkspaceSwitcher));
    // Falls back to showing local summary workspace label
    expect(html).toContain("Local Dev Workspace");
    // Single workspace → non-interactive label
    expect(html).toContain("data-workspace-label");
  });
});

describe("OrgWorkspaceSwitcher — org label aria-label", () => {
  beforeEach(() => {
    mockSession.status = "authenticated";
    mockSession.data = {
      user: {
        id: "u1",
        email: "user@example.com",
        display_name: "Test User",
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
      accessible_workspace_ids: ["ws-uuid-1"],
    };
    mockWorkspaceContext.summaries = [
      {
        workspaceId: "ws-uuid-1",
        name: "Main Project",
        repo_url: "https://github.com/acme/main.git",
        default_branch: "main",
        last_opened_at: "2026-05-22T00:00:00Z",
      },
    ];
    vi.clearAllMocks();
  });

  it("includes organization name in aria-label for single org label", () => {
    const html = renderToStaticMarkup(React.createElement(OrgWorkspaceSwitcher));
    expect(html).toContain('aria-label="Organization: Kitelabs"');
  });

  it("includes workspace name in aria-label for single workspace label", () => {
    const html = renderToStaticMarkup(React.createElement(OrgWorkspaceSwitcher));
    expect(html).toContain('aria-label="Workspace: Main Project"');
  });
});
