// @vitest-environment jsdom
/**
 * T9 — Agents/Team (roster real; workload placeholder)
 *
 * Covers:
 * - useTeamMembers returns real members with placeholder workload/status fields
 * - MemberRow renders display name, email, role, workload placeholder, status placeholder
 * - TeamPage renders the member roster when workspace is selected
 * - TeamPage shows "no workspace" state when workspaceId is null
 * - TeamPage shows empty state when roster is empty
 * - TeamPage shows error state when fetch fails
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/team"),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn(() => null), toString: () => "" }),
}));

vi.mock("@/services/user-service/client", () => ({
  fetchWorkspaceMembers: vi.fn(),
  fetchWorkspaceInvitations: vi.fn(),
  inviteMember: vi.fn(),
  removeMember: vi.fn(),
  cancelInvitation: vi.fn(),
  getUserServiceBase: vi.fn(() => ""),
  fetchMe: vi.fn(),
  logout: vi.fn(),
  getMeData: vi.fn(),
}));

import { fetchWorkspaceMembers } from "@/services/user-service/client";
const mockFetchMembers = fetchWorkspaceMembers as ReturnType<typeof vi.fn>;

// WorkspaceContext mock — controls selectedWorkspaceId
let mockWorkspaceId: string | null = "ws-123";
vi.mock("@/features/workspaces/context/WorkspaceContext", () => ({
  useWorkspaceContext: () => ({
    selectedWorkspaceId: mockWorkspaceId,
    activeWorkspace: null,
    loadingWorkspace: false,
    workspaceError: null,
  }),
}));

import { useTeamMembers, MemberRow } from "@/features/team";
import type { TeamMember } from "@/features/team";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MEMBER_ALICE: TeamMember = {
  user_id: "u1",
  email: "alice@example.com",
  display_name: "Alice",
  role: "admin",
  workloadPct: null,
  activityStatus: null,
};

const MEMBER_BOB: TeamMember = {
  user_id: "u2",
  email: "bob@example.com",
  display_name: null,
  role: "member",
  workloadPct: null,
  activityStatus: null,
};

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useTeamMembers", () => {
  beforeEach(() => {
    mockWorkspaceId = "ws-123";
    mockFetchMembers.mockResolvedValue({
      members: [
        { user_id: "u1", email: "alice@example.com", display_name: "Alice", role: "admin" },
      ],
    });
  });

  it("returns members with placeholder workload and activityStatus", async () => {
    const qc = makeQC();
    const { result } = renderHook(() => useTeamMembers(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.members).toHaveLength(1);
    expect(result.current.members[0].workloadPct).toBeNull();
    expect(result.current.members[0].activityStatus).toBeNull();
    expect(result.current.members[0].display_name).toBe("Alice");
  });

  it("returns empty array when workspace not selected", async () => {
    mockWorkspaceId = null;
    const qc = makeQC();
    const { result } = renderHook(() => useTeamMembers(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.members).toHaveLength(0);
    expect(result.current.workspaceId).toBeNull();
  });
});

describe("MemberRow", () => {
  it("renders display name, email, role badge, and placeholder columns", () => {
    const { container } = render(
      <QueryClientProvider client={makeQC()}>
        <MemberRow member={MEMBER_ALICE} />
      </QueryClientProvider>
    );
    expect(container.querySelector("[data-member-row]")).not.toBeNull();
    expect(container.textContent).toContain("Alice");
    expect(container.textContent).toContain("alice@example.com");
    expect(container.textContent).toContain("admin");
    expect(container.querySelector("[data-workload-placeholder]")).not.toBeNull();
    expect(container.querySelector("[data-status-placeholder]")).not.toBeNull();
  });

  it("falls back to email as display name when display_name is null", () => {
    const { container } = render(
      <QueryClientProvider client={makeQC()}>
        <MemberRow member={MEMBER_BOB} />
      </QueryClientProvider>
    );
    expect(container.textContent).toContain("bob@example.com");
    expect(container.textContent).toContain("member");
  });
});

describe("TeamPage", () => {
  beforeEach(() => {
    mockWorkspaceId = "ws-123";
  });

  it("renders data-team-page attribute", async () => {
    mockFetchMembers.mockResolvedValue({ members: [] });
    const TeamPage = (await import("@/app/(shell)/team/page")).default;
    const { container } = render(
      <QueryClientProvider client={makeQC()}>
        <TeamPage />
      </QueryClientProvider>
    );
    expect(container.querySelector("[data-team-page]")).not.toBeNull();
  });

  it("shows no-workspace state when workspaceId is null", async () => {
    mockWorkspaceId = null;
    const TeamPage = (await import("@/app/(shell)/team/page")).default;
    const { container } = render(
      <QueryClientProvider client={makeQC()}>
        <TeamPage />
      </QueryClientProvider>
    );
    expect(container.querySelector("[data-team-page]")).not.toBeNull();
    expect(container.textContent).toContain("No workspace selected");
  });

  it("shows member rows when roster loads", async () => {
    mockWorkspaceId = "ws-123";
    mockFetchMembers.mockResolvedValue({
      members: [
        { user_id: "u1", email: "alice@example.com", display_name: "Alice", role: "admin" },
        { user_id: "u2", email: "bob@example.com", display_name: "Bob", role: "member" },
      ],
    });
    const TeamPage = (await import("@/app/(shell)/team/page")).default;
    const { container } = render(
      <QueryClientProvider client={makeQC()}>
        <TeamPage />
      </QueryClientProvider>
    );

    await waitFor(() =>
      expect(container.querySelectorAll("[data-member-row]").length).toBe(2)
    );
    expect(container.textContent).toContain("Alice");
    expect(container.textContent).toContain("Bob");
  });

  it("shows error message on fetch failure", async () => {
    mockWorkspaceId = "ws-123";
    mockFetchMembers.mockRejectedValue(new Error("Network error"));
    const TeamPage = (await import("@/app/(shell)/team/page")).default;
    const { container } = render(
      <QueryClientProvider client={makeQC()}>
        <TeamPage />
      </QueryClientProvider>
    );

    await waitFor(() =>
      expect(container.textContent).toContain("Failed to load team roster")
    );
  });

  it("shows empty state when roster is empty", async () => {
    mockWorkspaceId = "ws-123";
    mockFetchMembers.mockResolvedValue({ members: [] });
    const TeamPage = (await import("@/app/(shell)/team/page")).default;
    const { container } = render(
      <QueryClientProvider client={makeQC()}>
        <TeamPage />
      </QueryClientProvider>
    );

    await waitFor(() =>
      expect(container.textContent).toContain("No members found")
    );
  });
});
