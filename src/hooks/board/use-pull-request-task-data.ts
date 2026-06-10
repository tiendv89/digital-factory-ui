"use client";

import { useMemo } from "react";

import type { BoardLoadError } from "@/components/board/types";
import type { ParsedFeature } from "@/services/yaml-parser";
import { mapApiBoardError } from "@/utils/board/error-utils";
import { adaptTaskSummariesToFeatures } from "@/utils/workspaces/workspace-adapter";

import { useSidebarTasks } from "./use-sidebar-tasks";

export type UsePullRequestTaskDataResult = {
  trackedFeatures: ParsedFeature[];
  loading: boolean;
  error: BoardLoadError | null;
  reload: () => void;
};

export function usePullRequestTaskData(workspaceId: string | null): UsePullRequestTaskDataResult {
  const { tasks, loading, error, reload } = useSidebarTasks(workspaceId);

  const trackedFeatures = useMemo(() => adaptTaskSummariesToFeatures(tasks), [tasks]);

  return {
    trackedFeatures,
    loading,
    error: error ? mapApiBoardError(error) : null,
    reload,
  };
}
