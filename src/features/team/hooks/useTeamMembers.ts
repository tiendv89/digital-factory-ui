"use client";

import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import { useWorkspaceMembers } from "@/features/admin/hooks/useAdminMembers";
import type { Member } from "@/services/user-service";

export interface TeamMember extends Member {
  /** Placeholder — no telemetry source in v1. */
  workloadPct: null;
  /** Placeholder — no telemetry source in v1. */
  activityStatus: null;
}

export interface UseTeamMembersResult {
  members: TeamMember[];
  loading: boolean;
  error: Error | null;
  workspaceId: string | null;
}

export function useTeamMembers(): UseTeamMembersResult {
  const { selectedWorkspaceId } = useWorkspaceContext();
  const { members, loading, error } = useWorkspaceMembers(selectedWorkspaceId);

  const teamMembers: TeamMember[] = members.map((m) => ({
    ...m,
    workloadPct: null,
    activityStatus: null,
  }));

  return {
    members: teamMembers,
    loading,
    error,
    workspaceId: selectedWorkspaceId,
  };
}
