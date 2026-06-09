"use client";

import { useMutation } from "@tanstack/react-query";
import { createWorkspace } from "@/services/workflow-backend";
import type {
  CreateWorkspaceRequest,
  WorkspaceDetail,
} from "@/services/workflow-backend";

export function useCreateWorkspace() {
  return useMutation<WorkspaceDetail, Error, CreateWorkspaceRequest>({
    mutationFn: (body) => createWorkspace(body),
  });
}
