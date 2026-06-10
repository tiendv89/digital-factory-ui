"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Invitation, InviteRequest, Member } from "@/services/user-service";
import { cancelInvitation, fetchWorkspaceInvitations, fetchWorkspaceMembers, inviteMember, removeMember } from "@/services/user-service";

const adminKeys = {
  members: (workspaceId: string) => ["admin", "workspace", workspaceId, "members"] as const,
  invitations: (workspaceId: string) => ["admin", "workspace", workspaceId, "invitations"] as const,
};

export function useWorkspaceMembers(workspaceId: string | null) {
  const { data, isLoading, error, refetch } = useQuery<Member[], Error>({
    queryKey: workspaceId ? adminKeys.members(workspaceId) : ["admin-members-disabled"],
    queryFn: () => fetchWorkspaceMembers(workspaceId!).then((r) => r.members),
    enabled: Boolean(workspaceId),
  });
  return {
    members: data ?? [],
    loading: isLoading,
    error: error ?? null,
    reload: () => void refetch(),
  };
}

export function useWorkspaceInvitations(workspaceId: string | null) {
  const { data, isLoading, error, refetch } = useQuery<Invitation[], Error>({
    queryKey: workspaceId ? adminKeys.invitations(workspaceId) : ["admin-invitations-disabled"],
    queryFn: () => fetchWorkspaceInvitations(workspaceId!).then((r) => r.invitations),
    enabled: Boolean(workspaceId),
  });
  return {
    invitations: data ?? [],
    loading: isLoading,
    error: error ?? null,
    reload: () => void refetch(),
  };
}

export function useInviteMember(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, InviteRequest>({
    mutationFn: (body) => inviteMember(workspaceId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminKeys.invitations(workspaceId),
      });
    },
  });
}

export function useRemoveMember(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (userId) => removeMember(workspaceId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminKeys.members(workspaceId),
      });
    },
  });
}

export function useCancelInvitation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (invitationId) => cancelInvitation(workspaceId, invitationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminKeys.invitations(workspaceId),
      });
    },
  });
}
