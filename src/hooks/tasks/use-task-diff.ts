"use client";

import { useQuery } from "@tanstack/react-query";

import { workspaceKeys } from "@/constants/query-keys";
import { getTaskDiff } from "@/services/workflow-backend/client";
import type { ApiError, TaskDiff } from "@/services/workflow-backend/types";

const CACHE_TIME_MS = 30_000;

export type UseTaskDiffResult = {
  data: TaskDiff | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
};

export function useTaskDiff(workspaceId: string | null, taskId: string | null, repo?: string): UseTaskDiffResult {
  const enabled = Boolean(workspaceId) && Boolean(taskId);

  const { data, isFetching, error, refetch } = useQuery<TaskDiff, ApiError>({
    queryKey: enabled ? workspaceKeys.taskDiff(workspaceId!, taskId!, repo) : ["task-diff-disabled"],
    queryFn: () => getTaskDiff(workspaceId!, taskId!, repo),
    enabled,
    staleTime: CACHE_TIME_MS,
    gcTime: CACHE_TIME_MS,
  });

  return {
    data: data ?? null,
    loading: isFetching && !data,
    error: error ?? null,
    reload: () => void refetch(),
  };
}
