"use client";

import { useQuery } from "@tanstack/react-query";
import { getFeatureTaskList } from "@/services/workflow-backend/client";
import { buildFeatureTaskParams } from "@/services/workflow-backend/query-params";
import type { FeatureTaskParams } from "@/services/workflow-backend/query-params";
import type { FeatureTaskPage, ApiError } from "@/services/workflow-backend/types";
import { workspaceKeys } from "@/lib/query-keys";

const CACHE_TIME_MS = 60_000;

export type UseFeatureTaskListResult = {
  data: FeatureTaskPage | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
};

export function useFeatureTaskList(
  workspaceId: string | null,
  params: FeatureTaskParams = {},
): UseFeatureTaskListResult {
  const enabled = Boolean(workspaceId);

  const { data, isFetching, error, refetch } = useQuery<FeatureTaskPage, ApiError>({
    queryKey: enabled
      ? workspaceKeys.taskModeFeatures(workspaceId!, params)
      : ["task-mode-features-disabled"],
    queryFn: () => getFeatureTaskList(workspaceId!, buildFeatureTaskParams(params)),
    enabled,
    staleTime: CACHE_TIME_MS,
    gcTime: CACHE_TIME_MS,
    refetchInterval: CACHE_TIME_MS,
  });

  return {
    data: data ?? null,
    loading: isFetching && !data,
    error: error ?? null,
    reload: () => void refetch(),
  };
}
