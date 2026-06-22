"use client";

import { useMutation } from "@tanstack/react-query";

import { useSession } from "@/components/auth";
import { refreshBffSession } from "@/constants/axios";
import type { CreateWorkspaceRequest, WorkspaceDetail } from "@/services/workflow-backend";
import { createWorkspace } from "@/services/workflow-backend";

export function useCreateWorkspace() {
  const { refreshSession } = useSession();
  return useMutation<WorkspaceDetail, Error, CreateWorkspaceRequest>({
    mutationFn: (body) => createWorkspace(body),
    onSuccess: () => {
      void refreshBffSession().finally(() => refreshSession());
    },
  });
}
