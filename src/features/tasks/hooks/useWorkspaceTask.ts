"use client";

import { useQuery } from "@tanstack/react-query";
import { getWorkspaceTask } from "@/services/workflow-backend/client";
import type { TaskDetail, ApiError } from "@/services/workflow-backend/types";
import { workspaceKeys } from "@/lib/query-keys";

export type UseWorkspaceTaskResult = {
  task: TaskDetail | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
};

export function useWorkspaceTask(
  workspaceId: string | null,
  taskId: string | null,
): UseWorkspaceTaskResult {
  const enabled = Boolean(workspaceId && taskId);

  const { data, isFetching, error, refetch } = useQuery<TaskDetail, ApiError>({
    queryKey: enabled
      ? workspaceKeys.task(workspaceId!, taskId!)
      : ["workspace-task-disabled"],
    queryFn: () => getWorkspaceTask(workspaceId!, taskId!),
    enabled,
  });

  return {
    task: data ?? null,
    loading: isFetching && !data,
    error: error ?? null,
    reload: () => void refetch(),
  };
}
