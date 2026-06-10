"use client";

import { useQuery } from "@tanstack/react-query";

import { workspaceKeys } from "@/constants/query-keys";
import { getFeature, getFeatureTask } from "@/services/workflow-backend/client";
import type { ApiError, FeatureDetail, TaskDetail } from "@/services/workflow-backend/types";

export type UseFeatureDetailResult = {
  feature: FeatureDetail | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
};

export function useFeatureDetail(workspaceId: string | null, featureId: string | null): UseFeatureDetailResult {
  const enabled = Boolean(workspaceId && featureId);

  const { data, isFetching, error, refetch } = useQuery<FeatureDetail, ApiError>({
    queryKey: enabled ? workspaceKeys.feature(workspaceId!, featureId!) : ["workspace-feature-disabled"],
    queryFn: () => getFeature(workspaceId!, featureId!),
    enabled,
  });

  return {
    feature: data ?? null,
    loading: isFetching && !data,
    error: error ?? null,
    reload: () => void refetch(),
  };
}

export type UseFeatureTaskResult = {
  task: TaskDetail | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
};

export function useFeatureTask(workspaceId: string | null, featureId: string | null, taskId: string | null): UseFeatureTaskResult {
  const enabled = Boolean(workspaceId && featureId && taskId);

  const { data, isFetching, error, refetch } = useQuery<TaskDetail, ApiError>({
    queryKey: enabled ? workspaceKeys.featureTask(workspaceId!, featureId!, taskId!) : ["workspace-feature-task-disabled"],
    queryFn: () => getFeatureTask(workspaceId!, featureId!, taskId!),
    enabled,
  });

  return {
    task: data ?? null,
    loading: isFetching && !data,
    error: error ?? null,
    reload: () => void refetch(),
  };
}
