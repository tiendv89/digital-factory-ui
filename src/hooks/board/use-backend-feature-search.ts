"use client";

import { useQuery } from "@tanstack/react-query";

import type { BoardLoadError, PaginationMeta } from "@/components/board/types";
import { workspaceKeys } from "@/constants/query-keys";
import { buildFeatureParams, type FeatureSearchParams, searchFeaturesPage } from "@/services/workflow-backend";
import type { ParsedFeature } from "@/services/yaml-parser";
import { adaptFeatureSummaries } from "@/utils/workspaces/workspace-adapter";

function isEmptyParams(params: FeatureSearchParams): boolean {
  return !params.title && !params.status;
}

export type UseBackendFeatureSearchResult = {
  results: ParsedFeature[] | null;
  searching: boolean;
  searchError: BoardLoadError | null;
  pagination: PaginationMeta | null;
};

export function useBackendFeatureSearch(workspaceId: string | null, params: FeatureSearchParams): UseBackendFeatureSearchResult {
  const { title, status, page, limit, sort } = params;
  const searchParams = { title, status, page, limit, sort };
  const active = Boolean(workspaceId) && !isEmptyParams(searchParams);

  const { data, isFetching, error } = useQuery({
    queryKey: workspaceKeys.features(workspaceId ?? "", searchParams),
    queryFn: async () => {
      const paged = await searchFeaturesPage(workspaceId!, buildFeatureParams(searchParams));
      return paged;
    },
    enabled: active,
    placeholderData: (prev) => prev,
  });

  if (!active) {
    return { results: null, searching: false, searchError: null, pagination: null };
  }

  if (error) {
    const e = error as { code?: string; message?: string; retryable?: boolean };
    return {
      results: [],
      searching: false,
      searchError: {
        kind: "network_error",
        message: e.message ?? "Feature search failed",
        retryable: e.retryable,
      },
      pagination: null,
    };
  }

  return {
    results: data ? adaptFeatureSummaries(data.items) : null,
    searching: isFetching && !data,
    searchError: null,
    pagination: data ? { total: data.total, page: data.page, limit: data.limit } : null,
  };
}
