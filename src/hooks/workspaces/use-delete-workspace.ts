"use client";

import { useMutation } from "@tanstack/react-query";

import { useSession } from "@/components/auth";
import { refreshBffSession } from "@/constants/axios";
import { deleteWorkspace } from "@/services/workflow-backend";

export function useDeleteWorkspace() {
  const { refreshSession } = useSession();
  return useMutation<void, Error, string>({
    mutationFn: (workspaceId) => deleteWorkspace(workspaceId),
    onSuccess: () => {
      void refreshBffSession().finally(() => refreshSession());
    },
  });
}
