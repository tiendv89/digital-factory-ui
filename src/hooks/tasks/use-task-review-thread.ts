"use client";

import { useQuery } from "@tanstack/react-query";

import { workspaceKeys } from "@/constants/query-keys";
import { getTaskReviewThread } from "@/services/workflow-backend/client";
import type { ApiError, TaskReviewThread } from "@/services/workflow-backend/types";

const CACHE_TIME_MS = 30_000;

export type UseTaskReviewThreadResult = {
  data: TaskReviewThread | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
};

export function useTaskReviewThread(workspaceId: string | null, taskId: string | null, repo?: string): UseTaskReviewThreadResult {
  const enabled = Boolean(workspaceId) && Boolean(taskId);

  const { data, isFetching, error, refetch } = useQuery<TaskReviewThread, ApiError>({
    queryKey: enabled ? workspaceKeys.taskReviewThread(workspaceId!, taskId!, repo) : ["task-review-thread-disabled"],
    queryFn: () => getTaskReviewThread(workspaceId!, taskId!, repo),
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
