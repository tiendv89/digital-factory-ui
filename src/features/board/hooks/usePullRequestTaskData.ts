"use client";

import type { ParsedFeature } from "@/services/yaml-parser";
import { useSidebarTasks } from "./useSidebarTasks";
import { adaptTaskSummariesToFeatures } from "@/features/workspaces/lib/workspaceAdapter";
import { mapApiBoardError } from "../lib/error-utils";
import type { BoardLoadError } from "../types";

export type UsePullRequestTaskDataResult = {
  trackedFeatures: ParsedFeature[];
  loading: boolean;
  error: BoardLoadError | null;
  reload: () => void;
};

export function usePullRequestTaskData(
  workspaceId: string | null,
): UsePullRequestTaskDataResult {
  const { tasks, loading, error, reload } = useSidebarTasks(workspaceId);

  const trackedFeatures = adaptTaskSummariesToFeatures(tasks);

  return {
    trackedFeatures,
    loading,
    error: error ? mapApiBoardError(error) : null,
    reload,
  };
}
