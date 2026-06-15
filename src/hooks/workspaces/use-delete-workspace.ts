"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteWorkspace } from "@/services/workflow-backend";

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (workspaceId) => deleteWorkspace(workspaceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}
