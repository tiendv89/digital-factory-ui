// @vitest-environment jsdom
/**
 * Admin members hooks — integration tests.
 *
 * Verifies that successful mutations trigger query invalidation,
 * causing the UI to reflect the updated state (invite→appears,
 * cancel→disappears, remove→disappears).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useInviteMember,
  useRemoveMember,
  useCancelInvitation,
  useWorkspaceMembers,
  useWorkspaceInvitations,
} from "@/features/admin/hooks/useAdminMembers";

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

import {
  fetchWorkspaceMembers,
  fetchWorkspaceInvitations,
  inviteMember,
  removeMember,
  cancelInvitation,
} from "@/services/user-service/client";

const mockFetchMembers = fetchWorkspaceMembers as ReturnType<typeof vi.fn>;
const mockFetchInvitations = fetchWorkspaceInvitations as ReturnType<typeof vi.fn>;
const mockInviteMember = inviteMember as ReturnType<typeof vi.fn>;
const mockRemoveMember = removeMember as ReturnType<typeof vi.fn>;
const mockCancelInvitation = cancelInvitation as ReturnType<typeof vi.fn>;

const WORKSPACE_ID = "ws-test";

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── invite → pending invite appears ────────────────────────────────────────

describe("useInviteMember", () => {
  it("invalidates invitations query on success so new invite appears", async () => {
    const queryClient = makeQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    mockInviteMember.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useInviteMember(WORKSPACE_ID), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate({ email: "new@example.com", role: "member" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockInviteMember).toHaveBeenCalledWith(WORKSPACE_ID, {
      email: "new@example.com",
      role: "member",
    });
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["admin", "workspace", WORKSPACE_ID, "invitations"],
      }),
    );
  });

  it("does not invalidate on failure", async () => {
    const queryClient = makeQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    mockInviteMember.mockRejectedValueOnce(new Error("422"));

    const { result } = renderHook(() => useInviteMember(WORKSPACE_ID), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate({ email: "bad@example.com", role: "member" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

// ─── cancel → invite disappears ─────────────────────────────────────────────

describe("useCancelInvitation", () => {
  it("invalidates invitations query on success so cancelled invite disappears", async () => {
    const queryClient = makeQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    mockCancelInvitation.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useCancelInvitation(WORKSPACE_ID), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate("inv-abc");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCancelInvitation).toHaveBeenCalledWith(WORKSPACE_ID, "inv-abc");
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["admin", "workspace", WORKSPACE_ID, "invitations"],
      }),
    );
  });
});

// ─── remove → member disappears ─────────────────────────────────────────────

describe("useRemoveMember", () => {
  it("invalidates members query on success so removed member disappears", async () => {
    const queryClient = makeQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    mockRemoveMember.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useRemoveMember(WORKSPACE_ID), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate("user-xyz");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRemoveMember).toHaveBeenCalledWith(WORKSPACE_ID, "user-xyz");
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["admin", "workspace", WORKSPACE_ID, "members"],
      }),
    );
  });
});

// ─── query hooks return correct shape ────────────────────────────────────────

describe("useWorkspaceMembers", () => {
  it("returns members from API response", async () => {
    const queryClient = makeQueryClient();
    const members = [
      { user_id: "u1", email: "a@b.com", display_name: "Alice", role: "member" },
    ];
    mockFetchMembers.mockResolvedValueOnce({ members });

    const { result } = renderHook(() => useWorkspaceMembers(WORKSPACE_ID), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.members).toEqual(members);
    expect(result.current.error).toBeNull();
  });

  it("returns error when fetch fails", async () => {
    const queryClient = makeQueryClient();
    mockFetchMembers.mockRejectedValueOnce(new Error("403"));

    const { result } = renderHook(() => useWorkspaceMembers(WORKSPACE_ID), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.members).toEqual([]);
  });
});

describe("useWorkspaceInvitations", () => {
  it("returns invitations from API response", async () => {
    const queryClient = makeQueryClient();
    const invitations = [
      {
        id: "inv-1",
        email: "b@c.com",
        role: "member",
        expires_at: "2026-12-31T00:00:00Z",
      },
    ];
    mockFetchInvitations.mockResolvedValueOnce({ invitations });

    const { result } = renderHook(
      () => useWorkspaceInvitations(WORKSPACE_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.invitations).toEqual(invitations);
    expect(result.current.error).toBeNull();
  });
});
