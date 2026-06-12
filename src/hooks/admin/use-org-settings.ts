"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ChangeOrgMemberRoleRequest, Org, OrgInvitation, OrgInviteRequest, OrgMember, TransferOrgOwnershipRequest, UpdateOrgRequest } from "@/services/user-service";
import {
  cancelOrgInvitation,
  changeOrgMemberRole,
  deleteOrg,
  fetchOrg,
  fetchOrgInvitations,
  fetchOrgMembers,
  inviteOrgMember,
  removeOrgMember,
  transferOrgOwnership,
  updateOrg,
} from "@/services/user-service";

const orgKeys = {
  org: (orgId: string) => ["org", orgId] as const,
  members: (orgId: string) => ["org", orgId, "members"] as const,
  invitations: (orgId: string) => ["org", orgId, "invitations"] as const,
};

export function useOrg(orgId: string | null) {
  const { data, isLoading, error } = useQuery<Org, Error>({
    queryKey: orgId ? orgKeys.org(orgId) : ["org-disabled"],
    queryFn: () => fetchOrg(orgId!),
    enabled: Boolean(orgId),
  });
  return { org: data ?? null, loading: isLoading, error: error ?? null };
}

export function useUpdateOrg(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation<Org, Error, UpdateOrgRequest>({
    mutationFn: (body) => updateOrg(orgId, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(orgKeys.org(orgId), updated);
    },
  });
}

export function useOrgMembers(orgId: string | null) {
  const { data, isLoading, error, refetch } = useQuery<OrgMember[], Error>({
    queryKey: orgId ? orgKeys.members(orgId) : ["org-members-disabled"],
    queryFn: () => fetchOrgMembers(orgId!),
    enabled: Boolean(orgId),
  });
  return {
    members: data ?? [],
    loading: isLoading,
    error: error ?? null,
    reload: () => void refetch(),
  };
}

export function useOrgInvitations(orgId: string | null) {
  const { data, isLoading, error, refetch } = useQuery<OrgInvitation[], Error>({
    queryKey: orgId ? orgKeys.invitations(orgId) : ["org-invitations-disabled"],
    queryFn: () => fetchOrgInvitations(orgId!),
    enabled: Boolean(orgId),
  });
  return {
    invitations: data ?? [],
    loading: isLoading,
    error: error ?? null,
    reload: () => void refetch(),
  };
}

export function useInviteOrgMember(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, OrgInviteRequest>({
    mutationFn: (body) => inviteOrgMember(orgId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orgKeys.invitations(orgId) });
    },
  });
}

export function useChangeOrgMemberRole(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { userId: string; body: ChangeOrgMemberRoleRequest }>({
    mutationFn: ({ userId, body }) => changeOrgMemberRole(orgId, userId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orgKeys.members(orgId) });
    },
  });
}

export function useRemoveOrgMember(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (userId) => removeOrgMember(orgId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orgKeys.members(orgId) });
    },
  });
}

export function useCancelOrgInvitation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (invitationId) => cancelOrgInvitation(orgId, invitationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orgKeys.invitations(orgId) });
    },
  });
}

export function useTransferOrgOwnership(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, TransferOrgOwnershipRequest>({
    mutationFn: (body) => transferOrgOwnership(orgId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orgKeys.members(orgId) });
    },
  });
}

export function useDeleteOrg(orgId: string) {
  return useMutation<void, Error, void>({
    mutationFn: () => deleteOrg(orgId),
  });
}
