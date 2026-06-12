"use client";

import { useQuery } from "@tanstack/react-query";

import { workspaceKeys } from "@/constants/query-keys";
import { getFeature } from "@/services/workflow-backend/client";
import type { ApiError, FeatureDetail } from "@/services/workflow-backend/types";

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
