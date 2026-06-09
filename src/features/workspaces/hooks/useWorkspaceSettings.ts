"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { changeOrgMemberRole } from "@/services/user-service";
import type { RoleChangeRequest } from "@/services/user-service";

const wsSettingsKeys = {
  members: (workspaceId: string) =>
    ["admin", "workspace", workspaceId, "members"] as const,
};

export type ChangeRoleArgs = {
  userId: string;
  role: "member" | "admin";
};

export function useChangeOrgMemberRole(orgId: string, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, ChangeRoleArgs>({
    mutationFn: ({ userId, role }: ChangeRoleArgs) =>
      changeOrgMemberRole(orgId, userId, { role } as RoleChangeRequest),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: wsSettingsKeys.members(workspaceId),
      });
    },
  });
}
