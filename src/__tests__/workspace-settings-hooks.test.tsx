// @vitest-environment jsdom
/**
 * Workspace settings hooks — unit tests.
 *
 * Verifies that useChangeOrgMemberRole:
 * - calls changeOrgMemberRole with the correct args
 * - invalidates the workspace members query on success
 * - does not invalidate on failure
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useChangeOrgMemberRole } from "@/features/workspaces/hooks/useWorkspaceSettings";

vi.mock("@/services/user-service/client", () => ({
  changeOrgMemberRole: vi.fn(),
  fetchWorkspaceMembers: vi.fn(),
  fetchWorkspaceInvitations: vi.fn(),
  inviteMember: vi.fn(),
  removeMember: vi.fn(),
  cancelInvitation: vi.fn(),
  getUserServiceBase: vi.fn(() => ""),
  fetchMe: vi.fn(),
  logout: vi.fn(),
  getMeData: vi.fn(),
  updateMe: vi.fn(),
}));

import { changeOrgMemberRole } from "@/services/user-service/client";
const mockChangeRole = changeOrgMemberRole as ReturnType<typeof vi.fn>;

const ORG_ID = "org-test-123";
const WORKSPACE_ID = "ws-test-456";

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
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

describe("useChangeOrgMemberRole", () => {
  it("calls changeOrgMemberRole with orgId, userId, and role", async () => {
    const queryClient = makeQueryClient();
    mockChangeRole.mockResolvedValueOnce(undefined);

    const { result } = renderHook(
      () => useChangeOrgMemberRole(ORG_ID, WORKSPACE_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    await act(async () => {
      result.current.mutate({ userId: "user-abc", role: "admin" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockChangeRole).toHaveBeenCalledWith(ORG_ID, "user-abc", {
      role: "admin",
    });
  });

  it("invalidates workspace members query on success", async () => {
    const queryClient = makeQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    mockChangeRole.mockResolvedValueOnce(undefined);

    const { result } = renderHook(
      () => useChangeOrgMemberRole(ORG_ID, WORKSPACE_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    await act(async () => {
      result.current.mutate({ userId: "user-abc", role: "member" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["admin", "workspace", WORKSPACE_ID, "members"],
      }),
    );
  });

  it("does not invalidate on failure", async () => {
    const queryClient = makeQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    mockChangeRole.mockRejectedValueOnce(new Error("403 Forbidden"));

    const { result } = renderHook(
      () => useChangeOrgMemberRole(ORG_ID, WORKSPACE_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    await act(async () => {
      result.current.mutate({ userId: "user-abc", role: "admin" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("reports an error when changeOrgMemberRole rejects", async () => {
    const queryClient = makeQueryClient();
    mockChangeRole.mockRejectedValueOnce(new Error("409 Last admin"));

    const { result } = renderHook(
      () => useChangeOrgMemberRole(ORG_ID, WORKSPACE_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    await act(async () => {
      result.current.mutate({ userId: "user-xyz", role: "member" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("409");
  });
});
