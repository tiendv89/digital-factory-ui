"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createWorkspace } from "@/services/workflow-backend";
import type {
  CreateWorkspaceRequest,
  WorkspaceDetail,
} from "@/services/workflow-backend";

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation<WorkspaceDetail, Error, CreateWorkspaceRequest>({
    mutationFn: (body) => createWorkspace(body),
    onSuccess: () => {
      // Invalidate /api/me so accessible_workspace_ids refreshes after creation.
      void queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}
