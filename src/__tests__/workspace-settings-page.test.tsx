// @vitest-environment jsdom
/**
 * WorkspaceSettingsPage — unit tests.
 *
 * Verifies:
 * - Tab switching (Members / General / Danger zone)
 * - Placeholder badges on General and Danger zone tabs
 * - No-workspace empty state
 * - Members tab renders member rows
 * - Role change UI present per member
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { WorkspaceSettingsPage } from "@/features/workspaces/components/WorkspaceSettings";

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/features/workspaces/context/WorkspaceContext", () => ({
  useWorkspaceContext: vi.fn(),
}));

vi.mock("@/features/workspaces/hooks/useOrgWorkspaceSelection", () => ({
  useOrgWorkspaceSelection: vi.fn(),
}));

vi.mock("@/features/admin/hooks/useAdminMembers", () => ({
  useWorkspaceMembers: vi.fn(),
  useWorkspaceInvitations: vi.fn(),
  useInviteMember: vi.fn(),
  useRemoveMember: vi.fn(),
  useCancelInvitation: vi.fn(),
}));

vi.mock("@/features/workspaces/hooks/useWorkspaceSettings", () => ({
  useChangeOrgMemberRole: vi.fn(),
}));

import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import { useOrgWorkspaceSelection } from "@/features/workspaces/hooks/useOrgWorkspaceSelection";
import {
  useWorkspaceMembers,
  useWorkspaceInvitations,
  useInviteMember,
  useRemoveMember,
  useCancelInvitation,
} from "@/features/admin/hooks/useAdminMembers";
import { useChangeOrgMemberRole } from "@/features/workspaces/hooks/useWorkspaceSettings";

const mockUseWorkspaceContext = useWorkspaceContext as ReturnType<typeof vi.fn>;
const mockUseOrgWorkspaceSelection = useOrgWorkspaceSelection as ReturnType<typeof vi.fn>;
const mockUseWorkspaceMembers = useWorkspaceMembers as ReturnType<typeof vi.fn>;
const mockUseWorkspaceInvitations = useWorkspaceInvitations as ReturnType<typeof vi.fn>;
const mockUseInviteMember = useInviteMember as ReturnType<typeof vi.fn>;
const mockUseRemoveMember = useRemoveMember as ReturnType<typeof vi.fn>;
const mockUseCancelInvitation = useCancelInvitation as ReturnType<typeof vi.fn>;
const mockUseChangeOrgMemberRole = useChangeOrgMemberRole as ReturnType<typeof vi.fn>;

const WORKSPACE_ID = "ws-123";
const ORG_ID = "org-456";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

function setupDefaultMocks() {
  mockUseWorkspaceContext.mockReturnValue({ selectedWorkspaceId: WORKSPACE_ID });
  mockUseOrgWorkspaceSelection.mockReturnValue({
    activeMembership: {
      organization_id: ORG_ID,
      organization_name: "Acme",
      organization_slug: "acme",
      role: "admin",
    },
    memberships: [],
    accessibleWorkspaceIds: [],
    isLoading: false,
    isEmpty: false,
    switchOrg: vi.fn(),
    switchWorkspace: vi.fn(),
    activeWorkspaceId: WORKSPACE_ID,
  });
  mockUseWorkspaceMembers.mockReturnValue({
    members: [],
    loading: false,
    error: null,
    reload: vi.fn(),
  });
  mockUseWorkspaceInvitations.mockReturnValue({
    invitations: [],
    loading: false,
    error: null,
    reload: vi.fn(),
  });
  mockUseInviteMember.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    reset: vi.fn(),
  });
  mockUseRemoveMember.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
  });
  mockUseCancelInvitation.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
  });
  mockUseChangeOrgMemberRole.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
  });
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("WorkspaceSettingsPage", () => {
  it("shows empty state when no workspace is selected", () => {
    mockUseWorkspaceContext.mockReturnValue({ selectedWorkspaceId: null });
    mockUseOrgWorkspaceSelection.mockReturnValue({
      activeMembership: null,
      memberships: [],
      accessibleWorkspaceIds: [],
      isLoading: false,
      isEmpty: true,
      switchOrg: vi.fn(),
      switchWorkspace: vi.fn(),
      activeWorkspaceId: null,
    });

    const { container } = render(<WorkspaceSettingsPage />, { wrapper: makeWrapper() });
    expect(container.querySelector("[data-ws-settings-no-workspace]")).toBeTruthy();
    expect(screen.getByText("No workspace selected.")).toBeDefined();
  });

  it("renders Members tab as default active tab", () => {
    setupDefaultMocks();
    const { container } = render(<WorkspaceSettingsPage />, { wrapper: makeWrapper() });

    const membersTab = container.querySelector("[data-ws-settings-tab='members']") as HTMLElement;
    expect(membersTab).toBeTruthy();
    expect(membersTab.getAttribute("aria-selected")).toBe("true");

    // Members tab panel should be rendered
    expect(container.querySelector("[data-ws-members-tab]")).toBeTruthy();
  });

  it("switches to General tab on click and shows placeholder badge", () => {
    setupDefaultMocks();
    const { container } = render(<WorkspaceSettingsPage />, { wrapper: makeWrapper() });

    const generalTab = container.querySelector("[data-ws-settings-tab='general']") as HTMLElement;
    fireEvent.click(generalTab);

    expect(generalTab.getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector("[data-ws-general-tab]")).toBeTruthy();
    expect(screen.getAllByText(/managed via import\/sync/i).length).toBeGreaterThan(0);
  });

  it("switches to Danger zone tab on click and shows placeholder badge", () => {
    setupDefaultMocks();
    const { container } = render(<WorkspaceSettingsPage />, { wrapper: makeWrapper() });

    const dangerTab = container.querySelector("[data-ws-settings-tab='danger-zone']") as HTMLElement;
    fireEvent.click(dangerTab);

    expect(dangerTab.getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector("[data-ws-danger-tab]")).toBeTruthy();
    expect(screen.getAllByText(/managed via import\/sync/i).length).toBeGreaterThan(0);
  });

  it("renders member rows when members are returned", () => {
    setupDefaultMocks();
    const members = [
      { user_id: "u1", email: "alice@example.com", display_name: "Alice", role: "admin" },
      { user_id: "u2", email: "bob@example.com", display_name: null, role: "member" },
    ];
    mockUseWorkspaceMembers.mockReturnValue({ members, loading: false, error: null, reload: vi.fn() });

    const { container } = render(<WorkspaceSettingsPage />, { wrapper: makeWrapper() });

    expect(container.querySelector("[data-member-row='u1']")).toBeTruthy();
    expect(container.querySelector("[data-member-row='u2']")).toBeTruthy();
    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("bob@example.com")).toBeDefined();
  });

  it("renders role-select for each member when orgId is present", () => {
    setupDefaultMocks();
    const members = [
      { user_id: "u1", email: "alice@example.com", display_name: "Alice", role: "admin" },
    ];
    mockUseWorkspaceMembers.mockReturnValue({ members, loading: false, error: null, reload: vi.fn() });

    const { container } = render(<WorkspaceSettingsPage />, { wrapper: makeWrapper() });

    const roleSelect = container.querySelector("[data-role-select='u1']") as HTMLSelectElement;
    expect(roleSelect).toBeTruthy();
    expect(roleSelect.value).toBe("admin");
  });

  it("renders Remove button for each member", () => {
    setupDefaultMocks();
    const members = [
      { user_id: "u1", email: "alice@example.com", display_name: "Alice", role: "member" },
    ];
    mockUseWorkspaceMembers.mockReturnValue({ members, loading: false, error: null, reload: vi.fn() });

    const { container } = render(<WorkspaceSettingsPage />, { wrapper: makeWrapper() });

    const removeBtn = container.querySelector("[data-remove-member='u1']") as HTMLElement;
    expect(removeBtn).toBeTruthy();
  });

  it("shows inline confirm dialog when Remove is clicked", async () => {
    setupDefaultMocks();
    const members = [
      { user_id: "u1", email: "alice@example.com", display_name: "Alice", role: "member" },
    ];
    mockUseWorkspaceMembers.mockReturnValue({ members, loading: false, error: null, reload: vi.fn() });

    const { container } = render(<WorkspaceSettingsPage />, { wrapper: makeWrapper() });

    const removeBtn = container.querySelector("[data-remove-member='u1']") as HTMLElement;
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(container.querySelector("[data-confirm-remove]")).toBeTruthy();
    });
    expect(container.querySelector("[data-confirm-remove-btn]")).toBeTruthy();
  });

  it("renders invite form with email input and role select", () => {
    setupDefaultMocks();
    const { container } = render(<WorkspaceSettingsPage />, { wrapper: makeWrapper() });

    const inviteForm = container.querySelector("[data-ws-invite-form]");
    expect(inviteForm).toBeTruthy();
    expect(container.querySelector("[data-invite-email-input]")).toBeTruthy();
    expect(container.querySelector("[data-invite-role-select]")).toBeTruthy();
    expect(container.querySelector("[data-invite-submit]")).toBeTruthy();
  });

  it("shows pending invitations when they exist", () => {
    setupDefaultMocks();
    mockUseWorkspaceInvitations.mockReturnValue({
      invitations: [
        {
          id: "inv-1",
          email: "charlie@example.com",
          role: "member",
          expires_at: "2026-12-31T00:00:00Z",
        },
      ],
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const { container } = render(<WorkspaceSettingsPage />, { wrapper: makeWrapper() });

    expect(container.querySelector("[data-ws-invitations-table]")).toBeTruthy();
    expect(container.querySelector("[data-invitation-row='inv-1']")).toBeTruthy();
    expect(screen.getByText("charlie@example.com")).toBeDefined();
  });

  it("calls useChangeOrgMemberRole with correct orgId and workspaceId when a member row renders", () => {
    setupDefaultMocks();
    const members = [
      { user_id: "u1", email: "alice@example.com", display_name: "Alice", role: "admin" },
    ];
    mockUseWorkspaceMembers.mockReturnValue({ members, loading: false, error: null, reload: vi.fn() });

    render(<WorkspaceSettingsPage />, { wrapper: makeWrapper() });

    expect(mockUseChangeOrgMemberRole).toHaveBeenCalledWith(ORG_ID, WORKSPACE_ID);
  });
});
