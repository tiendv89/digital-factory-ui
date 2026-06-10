"use client";

import { useQuery } from "@tanstack/react-query";

import type { BoardLoadError, PaginationMeta } from "@/components/board/types";
import { workspaceKeys } from "@/constants/query-keys";
import { buildTaskParams, searchWorkspaceTasksPage, type TaskSearchParams } from "@/services/workflow-backend";
import type { ParsedFeature } from "@/services/yaml-parser";
import { adaptTaskSummariesToFeatures } from "@/utils/workspaces/workspace-adapter";

function isEmptyParams(params: TaskSearchParams): boolean {
  return !params.task_id && !params.title && !params.status;
}

export type UseBackendTaskSearchResult = {
  results: ParsedFeature[] | null;
  searching: boolean;
  searchError: BoardLoadError | null;
  pagination: PaginationMeta | null;
};

export function useBackendTaskSearch(workspaceId: string | null, params: TaskSearchParams, featureStatuses?: ReadonlyMap<string, string>): UseBackendTaskSearchResult {
  const { task_id, title, status, page, limit, sort } = params;
  const searchParams = { task_id, title, status, page, limit, sort };
  const active = Boolean(workspaceId) && !isEmptyParams(searchParams);

  const { data, isFetching, error } = useQuery({
    queryKey: workspaceKeys.tasks(workspaceId ?? "", searchParams),
    queryFn: async () => {
      const paged = await searchWorkspaceTasksPage(workspaceId!, buildTaskParams(searchParams));
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
        message: e.message ?? "Task search failed",
        retryable: e.retryable,
      },
      pagination: null,
    };
  }

  return {
    results: data ? adaptTaskSummariesToFeatures(data.items, featureStatuses) : null,
    searching: isFetching && !data,
    searchError: null,
    pagination: data ? { total: data.total, page: data.page, limit: data.limit } : null,
  };
}
