"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteWorkspace } from "@/services/workflow-backend";

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (workspaceId) => deleteWorkspace(workspaceId),
    onSuccess: () => {
      // Invalidate /api/me so org_workspace_ids refreshes after deletion.
      void queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}
