"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { workspaceKeys } from "@/constants/query-keys";
import { type ApiError, searchWorkspaceTasks, SIDEBAR_TASK_PARAMS, type TaskSummary } from "@/services/workflow-backend";

export type UseSidebarTasksResult = {
  tasks: TaskSummary[];
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
};

export function useSidebarTasks(workspaceId: string | null): UseSidebarTasksResult {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: workspaceKeys.sidebarTasks(workspaceId ?? "", SIDEBAR_TASK_PARAMS),
    queryFn: () => searchWorkspaceTasks(workspaceId!, SIDEBAR_TASK_PARAMS),
    enabled: workspaceId !== null,
  });

  const reload = useCallback(() => {
    if (!workspaceId) return;
    queryClient.invalidateQueries({
      queryKey: workspaceKeys.sidebarTasks(workspaceId, SIDEBAR_TASK_PARAMS),
    });
    refetch();
  }, [workspaceId, queryClient, refetch]);

  if (!workspaceId) {
    return { tasks: [], loading: false, error: null, reload };
  }

  return {
    tasks: data ?? [],
    loading: isLoading,
    error: error as ApiError | null,
    reload,
  };
}
