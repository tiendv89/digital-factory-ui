"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import type { BoardLoadError } from "@/components/board/types";
import { workspaceKeys } from "@/constants/query-keys";
import type { WorkspaceDetail } from "@/services/workflow-backend";
import { getWorkspace } from "@/services/workflow-backend";
import type { ParsedFeature } from "@/services/yaml-parser";
import { mapApiBoardError } from "@/utils/board/error-utils";
import { adaptWorkspaceDetail } from "@/utils/workspaces/workspace-adapter";

export type UseBoardDataResult = {
  features: ParsedFeature[];
  loading: boolean;
  error: BoardLoadError | null;
  reload: () => void;
};

export type UseBoardDataOptions = {
  initialData?: WorkspaceDetail;
};

export function useBoardData(workspaceId: string | null, options: UseBoardDataOptions = {}): UseBoardDataResult {
  const { initialData } = options;
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: workspaceKeys.detail(workspaceId ?? ""),
    queryFn: () => getWorkspace(workspaceId!),
    enabled: workspaceId !== null,
    // Seed the cache with workspace data already loaded by WorkspaceContext.
    // TanStack Query renders immediately with this data while a background
    // fetch confirms freshness. On subsequent mounts within the 1-min stale
    // window the cache entry is used directly and no fetch is triggered.
    initialData: initialData ?? undefined,
  });

  const reload = useCallback(() => {
    if (!workspaceId) return;
    queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
    refetch();
  }, [workspaceId, queryClient, refetch]);

  if (!workspaceId) {
    return { features: [], loading: false, error: null, reload };
  }

  const features = data ? adaptWorkspaceDetail(data) : [];
  const boardError = error ? mapApiBoardError(error) : null;

  return { features, loading: isLoading, error: boardError, reload };
}
