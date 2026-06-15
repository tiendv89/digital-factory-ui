"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { CreateWorkspaceRequest, WorkspaceDetail } from "@/services/workflow-backend";
import { createWorkspace } from "@/services/workflow-backend";

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation<WorkspaceDetail, Error, CreateWorkspaceRequest>({
    mutationFn: (body) => createWorkspace(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}
