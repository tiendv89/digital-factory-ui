// @vitest-environment jsdom
/**
 * T14 — Create-org + create-workspace flows
 *
 * Covers:
 * - createOrg API client function builds the correct request
 * - createWorkspace API client function builds the correct request
 * - CreateOrgModal renders with name/slug fields; auto-fills slug from name
 * - CreateOrgModal calls mutate with correct payload on submit
 * - CreateWorkspaceModal renders with name/slug fields; auto-fills slug from name
 * - CreateWorkspaceModal calls mutate with correct payload on submit
 * - EmptyState shows "Create Organization" button when user has no memberships
 * - EmptyState shows generic message when user has memberships (not no-org state)
 * - EmptyState shows "Import workspace" link for platform_admin users
 * - OrgWorkspaceSwitcher shows "New Org" button when isEmpty
 * - OrgWorkspaceSwitcher shows "New Workspace" when org exists but no workspaces
 * - WorkspaceSwitcher footer includes "Create Workspace" and "Import Workspace"
 */

import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// Clean up the DOM after each test to prevent cross-test pollution.
afterEach(cleanup);

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
    "data-testid": testId,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    "data-testid"?: string;
  }) =>
    React.createElement(
      "a",
      { href, className, "data-testid": testId },
      children,
    ),
}));

// ── Mock React Query ──────────────────────────────────────────────────────────

const mockMutate = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useMutation: vi.fn(() => ({
    mutate: mockMutate,
    isPending: false,
    error: null,
  })),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
  }),
  useQuery: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

// ── Mock auth ─────────────────────────────────────────────────────────────────

const mockUseSession = vi.fn(() => ({
  session: {
    status: "authenticated",
    data: {
      data: {
        user: {
          id: "u1",
          email: "user@test.com",
          display_name: null,
          avatar_url: null,
          created_at: "",
          updated_at: "",
        },
        memberships: [] as {
          organization_id: string;
          organization_slug: string;
          organization_name: string;
          role: string;
        }[],
        accessible_workspace_ids: [] as string[],
      },
    },
  },
  logout: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  useSession: () => mockUseSession(),
}));

// ── Mock services ─────────────────────────────────────────────────────────────

vi.mock("@/services/user-service", () => ({
  createOrg: vi.fn(() =>
    Promise.resolve({
      id: "org-1",
      name: "Acme",
      slug: "acme",
      created_at: "",
      updated_at: "",
    }),
  ),
  fetchMe: vi.fn(() =>
    Promise.resolve({
      data: { user: {}, memberships: [], accessible_workspace_ids: [] },
    }),
  ),
  getMeData: (r: { data?: unknown } | { memberships: unknown[] }) =>
    "data" in r ? r.data : r,
  getUserServiceBase: () => "http://localhost:4000",
  updateMe: vi.fn(),
  fetchWorkspaceMembers: vi.fn(),
  fetchWorkspaceInvitations: vi.fn(),
  inviteMember: vi.fn(),
  removeMember: vi.fn(),
  cancelInvitation: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@/services/workflow-backend", () => ({
  createWorkspace: vi.fn(() =>
    Promise.resolve({
      id: "ws-1",
      name: "My WS",
      slug: "my-ws",
      repo_url: "",
      source_state: { stale: false },
      updated_at: "",
      features: [],
      tasks: [],
    }),
  ),
  getWorkspace: vi.fn(),
  importWorkspace: vi.fn(),
  syncWorkspace: vi.fn(),
  searchFeatures: vi.fn(() => Promise.resolve([])),
  searchWorkspaceTasks: vi.fn(() => Promise.resolve([])),
  request: vi.fn(),
}));

// ── Mock local-workspace-store ────────────────────────────────────────────────

vi.mock("@/services/local-workspace-store", () => ({
  getLocalWorkspaceSummaries: vi.fn(() => []),
  getSelectedWorkspaceId: vi.fn(() => null),
  saveLocalWorkspaceSummary: vi.fn(),
  removeLocalWorkspaceSummary: vi.fn(),
  setSelectedWorkspaceId: vi.fn(),
  clearSelectedWorkspaceId: vi.fn(),
  resolveBootstrapWorkspaceId: vi.fn(() => null),
}));

// ── Mock WorkspaceContext ─────────────────────────────────────────────────────

const mockWorkspaceCtx = {
  summaries: [] as {
    workspaceId: string;
    name: string;
    repo_url: string;
    default_branch: string;
    last_opened_at: string;
  }[],
  selectedWorkspaceId: null as string | null,
  activeWorkspace: null,
  loadingWorkspace: false,
  workspaceError: null,
  importingWorkspace: false,
  importError: null,
  syncingWorkspace: false,
  syncError: null,
  refreshingWorkspace: false,
  selectWorkspace: vi.fn(),
  importWorkspace: vi.fn(),
  clearImportError: vi.fn(),
  removeLocalSummary: vi.fn(),
  syncCurrentWorkspace: vi.fn(),
  clearSyncError: vi.fn(),
  refreshWorkspace: vi.fn(),
  activeSurface: "board" as const,
  openTaskTabs: [],
  activeTaskTabId: null,
  openTaskTab: vi.fn(),
  closeTaskTab: vi.fn(),
  activateTaskTab: vi.fn(),
  markTaskTabActive: vi.fn(),
  openFeatureTabs: [],
  activeFeatureTabId: null,
  openFeatureTab: vi.fn(),
  closeFeatureTab: vi.fn(),
  activateFeatureTab: vi.fn(),
  markFeatureTabActive: vi.fn(),
  goToBoard: vi.fn(),
};

const mockUseWorkspaceContext = vi.fn(() => mockWorkspaceCtx);

vi.mock("@/features/workspaces/context/WorkspaceContext", () => ({
  useWorkspaceContext: () => mockUseWorkspaceContext(),
  useWorkspaceActionsContext: () => ({
    syncCurrentWorkspace: vi.fn(),
    syncingWorkspace: false,
    syncError: null,
    refreshWorkspace: vi.fn(),
    refreshingWorkspace: false,
    openTaskTab: vi.fn(),
    openFeatureTab: vi.fn(),
  }),
  WorkspaceProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

// ── Mock workspaceAdapter ─────────────────────────────────────────────────────

vi.mock("@/features/workspaces/lib/workspaceAdapter", () => ({
  buildImportLocalSummary: vi.fn(
    (detail: { id: string; name: string }, _body: unknown, now: string) => ({
      workspaceId: detail.id,
      name: detail.name,
      repo_url: "",
      default_branch: "main",
      last_opened_at: now,
    }),
  ),
}));

// ── Mock supporting modules ───────────────────────────────────────────────────

vi.mock("@/lib/request-sequence", () => ({
  createRequestSequence: () => ({ next: () => 1, isCurrent: () => true }),
}));

vi.mock("@/features/board/lib/status-filter-store", () => ({
  clearStatusFilter: vi.fn(),
  clearFeatureStatusFilter: vi.fn(),
  clearBoardMode: vi.fn(),
}));

vi.mock("@/lib/query-keys", () => ({
  workspaceKeys: { detail: (id: string) => ["workspace", id] },
}));

// ── Static imports of components under test ───────────────────────────────────

import { CreateOrgModal } from "@/features/workspaces/components/CreateOrgModal";
import { CreateWorkspaceModal } from "@/features/workspaces/components/CreateWorkspaceModal";
import { EmptyState } from "@/features/workspaces/components/EmptyState";
import { OrgWorkspaceSwitcher } from "@/features/workspaces/components/OrgWorkspaceSwitcher";
import { WorkspaceSwitcher } from "@/features/workspaces/components/WorkspaceSwitcher";

// ─────────────────────────────────────────────────────────────────────────────
// ── API client unit tests ─────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

describe("user-service createOrg", () => {
  it("calls POST /api/orgs with name and slug", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            id: "org-1",
            name: "Acme",
            slug: "acme",
            created_at: "",
            updated_at: "",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { createOrg } = await import("@/services/user-service/client");
    await createOrg({ name: "Acme", slug: "acme" });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/orgs"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ name: "Acme", slug: "acme" }),
      }),
    );

    fetchSpy.mockRestore();
  });

  it("throws on non-ok response and parses error message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "slug already taken" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { createOrg } = await import("@/services/user-service/client");
    await expect(createOrg({ name: "Acme", slug: "acme" })).rejects.toThrow(
      "slug already taken",
    );
  });
});

describe("workflow-backend createWorkspace", () => {
  it("calls POST /api/workspaces with name and slug", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: "ws-1",
            name: "My WS",
            slug: "my-ws",
            repo_url: "",
            source_state: { stale: false },
            updated_at: "",
            features: [],
            tasks: [],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { createWorkspace } =
      await import("@/services/workflow-backend/client");
    await createWorkspace({ name: "My WS", slug: "my-ws" });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/workspaces"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ name: "My WS", slug: "my-ws" }),
      }),
    );

    fetchSpy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ── CreateOrgModal ────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

describe("CreateOrgModal", () => {
  beforeEach(() => {
    mockMutate.mockReset();
  });

  it("renders dialog with name and slug fields", () => {
    const html = renderToStaticMarkup(
      React.createElement(CreateOrgModal, {
        onClose: vi.fn(),
        onSuccess: vi.fn(),
      }),
    );
    expect(html).toContain("Create Organization");
    expect(html).toContain('id="org-name"');
    expect(html).toContain('id="org-slug"');
  });

  it("auto-fills slug from name input", () => {
    const { container } = render(
      React.createElement(CreateOrgModal, {
        onClose: vi.fn(),
        onSuccess: vi.fn(),
      }),
    );
    const nameInput = container.querySelector("#org-name") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Acme Corp" } });
    const slugInput = container.querySelector("#org-slug") as HTMLInputElement;
    expect(slugInput.value).toBe("acme-corp");
  });

  it("calls mutate with name and slug on submit", () => {
    const { container } = render(
      React.createElement(CreateOrgModal, {
        onClose: vi.fn(),
        onSuccess: vi.fn(),
      }),
    );
    fireEvent.change(container.querySelector("#org-name")!, {
      target: { value: "Acme Corp" },
    });
    fireEvent.submit(container.querySelector("form")!);
    expect(mockMutate).toHaveBeenCalledWith(
      { name: "Acme Corp", slug: "acme-corp" },
      expect.any(Object),
    );
  });

  it("submit button is disabled when fields are empty", () => {
    const { container } = render(
      React.createElement(CreateOrgModal, {
        onClose: vi.fn(),
        onSuccess: vi.fn(),
      }),
    );
    const submitBtn = container.querySelector(
      "[data-create-org-submit]",
    ) as HTMLButtonElement;
    expect(submitBtn).not.toBeNull();
    expect(submitBtn.hasAttribute("disabled")).toBe(true);
  });

  it("calls onClose when Cancel button is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      React.createElement(CreateOrgModal, { onClose, onSuccess: vi.fn() }),
    );
    const cancelBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Cancel",
    );
    expect(cancelBtn).not.toBeUndefined();
    fireEvent.click(cancelBtn!);
    expect(onClose).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ── CreateWorkspaceModal ──────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

describe("CreateWorkspaceModal", () => {
  beforeEach(() => {
    mockMutate.mockReset();
  });

  it("renders dialog with name and slug fields", () => {
    const html = renderToStaticMarkup(
      React.createElement(CreateWorkspaceModal, {
        onClose: vi.fn(),
        onSuccess: vi.fn(),
      }),
    );
    expect(html).toContain("Create Workspace");
    expect(html).toContain('id="workspace-name"');
    expect(html).toContain('id="workspace-slug"');
  });

  it("auto-fills slug from name input", () => {
    const { container } = render(
      React.createElement(CreateWorkspaceModal, {
        onClose: vi.fn(),
        onSuccess: vi.fn(),
      }),
    );
    const nameInput = container.querySelector(
      "#workspace-name",
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "My Workspace" } });
    const slugInput = container.querySelector(
      "#workspace-slug",
    ) as HTMLInputElement;
    expect(slugInput.value).toBe("my-workspace");
  });

  it("calls mutate with name and slug on submit", () => {
    const { container } = render(
      React.createElement(CreateWorkspaceModal, {
        onClose: vi.fn(),
        onSuccess: vi.fn(),
      }),
    );
    fireEvent.change(container.querySelector("#workspace-name")!, {
      target: { value: "My Workspace" },
    });
    fireEvent.submit(container.querySelector("form")!);
    expect(mockMutate).toHaveBeenCalledWith(
      { name: "My Workspace", slug: "my-workspace" },
      expect.any(Object),
    );
  });

  it("shows color/plan placeholder notice", () => {
    const html = renderToStaticMarkup(
      React.createElement(CreateWorkspaceModal, {
        onClose: vi.fn(),
        onSuccess: vi.fn(),
      }),
    );
    expect(html).toContain("Color");
    expect(html).toContain("plan");
  });

  it("submit button is disabled when fields are empty", () => {
    const { container } = render(
      React.createElement(CreateWorkspaceModal, {
        onClose: vi.fn(),
        onSuccess: vi.fn(),
      }),
    );
    const submitBtn = container.querySelector(
      "[data-create-workspace-submit]",
    ) as HTMLButtonElement;
    expect(submitBtn).not.toBeNull();
    expect(submitBtn.hasAttribute("disabled")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ── EmptyState (NoOrgState) ───────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

describe("EmptyState — no-org state", () => {
  it("shows Create Organization button when user has no memberships", () => {
    mockUseSession.mockReturnValueOnce({
      session: {
        status: "authenticated",
        data: {
          data: {
            user: {
              id: "u1",
              email: "user@test.com",
              display_name: null,
              avatar_url: null,
              created_at: "",
              updated_at: "",
            },
            memberships: [],
            accessible_workspace_ids: [],
          },
        },
      },
      logout: vi.fn(),
    });

    const { container } = render(React.createElement(EmptyState));
    const btn = container.querySelector(
      "[data-testid='empty-state-create-org']",
    );
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toContain("Create Organization");
  });

  it("opens CreateOrgModal when Create Organization button is clicked", () => {
    mockUseSession.mockReturnValueOnce({
      session: {
        status: "authenticated",
        data: {
          data: {
            user: {
              id: "u1",
              email: "user@test.com",
              display_name: null,
              avatar_url: null,
              created_at: "",
              updated_at: "",
            },
            memberships: [],
            accessible_workspace_ids: [],
          },
        },
      },
      logout: vi.fn(),
    });

    const { container } = render(React.createElement(EmptyState));
    const btn = container.querySelector(
      "[data-testid='empty-state-create-org']",
    ) as HTMLElement;
    fireEvent.click(btn);
    expect(container.querySelector("[data-create-org-modal]")).not.toBeNull();
  });

  it("shows default 'workspace will appear here' message when user has memberships", () => {
    mockUseSession.mockReturnValueOnce({
      session: {
        status: "authenticated",
        data: {
          data: {
            user: {
              id: "u1",
              email: "user@test.com",
              display_name: null,
              avatar_url: null,
              created_at: "",
              updated_at: "",
            },
            memberships: [
              {
                organization_id: "o1",
                organization_slug: "acme",
                organization_name: "Acme",
                role: "member",
              },
            ],
            accessible_workspace_ids: [],
          },
        },
      },
      logout: vi.fn(),
    });

    const { container } = render(React.createElement(EmptyState));
    expect(
      container.querySelector("[data-testid='empty-state-create-org']"),
    ).toBeNull();
    expect(container.textContent).toContain("workspace will appear here");
  });

  it("shows Import workspace link for platform_admin users", () => {
    mockUseSession.mockReturnValueOnce({
      session: {
        status: "authenticated",
        data: {
          data: {
            user: {
              id: "u1",
              email: "admin@test.com",
              display_name: null,
              avatar_url: null,
              created_at: "",
              updated_at: "",
            },
            memberships: [
              {
                organization_id: "o1",
                organization_slug: "acme",
                organization_name: "Acme",
                role: "platform_admin",
              },
            ],
            accessible_workspace_ids: [],
          },
        },
      },
      logout: vi.fn(),
    });

    const { container } = render(React.createElement(EmptyState));
    const importLink = container.querySelector(
      "[data-testid='empty-state-import-link']",
    );
    expect(importLink).not.toBeNull();
    expect(importLink!.getAttribute("href")).toBe("/admin/connect");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ── OrgWorkspaceSwitcher ──────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

describe("OrgWorkspaceSwitcher — create flows", () => {
  it("renders 'New Org' button when isEmpty (no memberships)", () => {
    // Default mock: memberships = []
    const html = renderToStaticMarkup(
      React.createElement(OrgWorkspaceSwitcher),
    );
    expect(html).toContain("New Org");
  });

  it("renders 'New Workspace' button when org exists but no accessible workspaces", () => {
    mockUseSession.mockReturnValueOnce({
      session: {
        status: "authenticated",
        data: {
          data: {
            user: {
              id: "u1",
              email: "user@test.com",
              display_name: null,
              avatar_url: null,
              created_at: "",
              updated_at: "",
            },
            memberships: [
              {
                organization_id: "o1",
                organization_slug: "acme",
                organization_name: "Acme",
                role: "admin",
              },
            ],
            accessible_workspace_ids: [],
          },
        },
      },
      logout: vi.fn(),
    });

    const html = renderToStaticMarkup(
      React.createElement(OrgWorkspaceSwitcher),
    );
    expect(html).toContain("New Workspace");
  });

  it("renders 'Create Org' trigger inside multi-org dropdown when opened", () => {
    mockUseSession.mockReturnValueOnce({
      session: {
        status: "authenticated",
        data: {
          data: {
            user: {
              id: "u1",
              email: "user@test.com",
              display_name: null,
              avatar_url: null,
              created_at: "",
              updated_at: "",
            },
            memberships: [
              {
                organization_id: "o1",
                organization_slug: "acme",
                organization_name: "Acme",
                role: "admin",
              },
              {
                organization_id: "o2",
                organization_slug: "beta",
                organization_name: "Beta",
                role: "member",
              },
            ],
            accessible_workspace_ids: ["ws-1"],
          },
        },
      },
      logout: vi.fn(),
    });

    mockUseWorkspaceContext.mockReturnValueOnce({
      ...mockWorkspaceCtx,
      summaries: [
        {
          workspaceId: "ws-1",
          name: "WS One",
          repo_url: "",
          default_branch: "main",
          last_opened_at: "",
        },
      ],
    });

    const { container } = render(React.createElement(OrgWorkspaceSwitcher));
    const orgDropdownBtn = container.querySelector(
      "[aria-label='Switch organization']",
    ) as HTMLElement;
    fireEvent.click(orgDropdownBtn);
    expect(container.querySelector("[data-create-org-trigger]")).not.toBeNull();
  });

  it("renders 'Create Workspace' trigger inside multi-workspace dropdown when opened", () => {
    mockUseSession.mockReturnValueOnce({
      session: {
        status: "authenticated",
        data: {
          data: {
            user: {
              id: "u1",
              email: "user@test.com",
              display_name: null,
              avatar_url: null,
              created_at: "",
              updated_at: "",
            },
            memberships: [
              {
                organization_id: "o1",
                organization_slug: "acme",
                organization_name: "Acme",
                role: "admin",
              },
            ],
            accessible_workspace_ids: ["ws-1", "ws-2"],
          },
        },
      },
      logout: vi.fn(),
    });

    mockUseWorkspaceContext.mockReturnValueOnce({
      ...mockWorkspaceCtx,
      summaries: [
        {
          workspaceId: "ws-1",
          name: "WS One",
          repo_url: "",
          default_branch: "main",
          last_opened_at: "",
        },
        {
          workspaceId: "ws-2",
          name: "WS Two",
          repo_url: "",
          default_branch: "main",
          last_opened_at: "",
        },
      ],
    });

    const { container } = render(React.createElement(OrgWorkspaceSwitcher));
    const wsDropdownBtn = container.querySelector(
      "[aria-label='Switch workspace']",
    ) as HTMLElement;
    fireEvent.click(wsDropdownBtn);
    expect(
      container.querySelector("[data-create-workspace-trigger]"),
    ).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ── WorkspaceSwitcher ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

describe("WorkspaceSwitcher — create workspace action", () => {
  it("renders 'Create Workspace' and 'Import Workspace' in footer when dropdown is open", () => {
    const { container } = render(React.createElement(WorkspaceSwitcher));
    const chevronBtn = container.querySelector(
      "[aria-label='Switch workspace']",
    ) as HTMLElement;
    fireEvent.click(chevronBtn);

    const createTrigger = container.querySelector(
      "[data-create-workspace-trigger]",
    );
    expect(createTrigger).not.toBeNull();
    expect(container.textContent).toContain("Import Workspace");
    expect(container.textContent).toContain("Create Workspace");
  });

  it("opens CreateWorkspaceModal when 'Create Workspace' is clicked", () => {
    const { container } = render(React.createElement(WorkspaceSwitcher));
    const chevronBtn = container.querySelector(
      "[aria-label='Switch workspace']",
    ) as HTMLElement;
    fireEvent.click(chevronBtn);

    const createTrigger = container.querySelector(
      "[data-create-workspace-trigger]",
    ) as HTMLElement;
    fireEvent.click(createTrigger);

    expect(
      container.querySelector("[data-create-workspace-modal]"),
    ).not.toBeNull();
  });
});
