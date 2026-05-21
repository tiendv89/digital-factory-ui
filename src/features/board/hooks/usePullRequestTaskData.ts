"use client";

import type { ParsedFeature } from "@/services/yaml-parser";
import type { BoardLoadError } from "../types";
import { useSidebarTasks } from "./useSidebarTasks";
import { adaptTaskSummariesToFeatures } from "@/features/workspaces/lib/workspaceAdapter";

export type UsePullRequestTaskDataResult = {
  trackedFeatures: ParsedFeature[];
  loading: boolean;
  error: BoardLoadError | null;
  reload: () => void;
};

function mapSidebarError(err: unknown): BoardLoadError {
  if (err && typeof err === "object" && "code" in err) {
    const e = err as { code: string; message: string };
    if (e.code === "DATABASE_NOT_FOUND" || e.code === "GITHUB_NOT_FOUND") {
      return { kind: "not_found", message: e.message };
    }
    if (e.code === "GITHUB_UNAUTHORIZED") {
      return { kind: "access_denied", message: e.message };
    }
    return { kind: "network_error", message: e.message };
  }
  if (err instanceof Error) {
    return { kind: "network_error", message: err.message };
  }
  return { kind: "network_error", message: "Unknown error" };
}

export function usePullRequestTaskData(
  workspaceId: string | null,
): UsePullRequestTaskDataResult {
  const { tasks, loading, error, reload } = useSidebarTasks(workspaceId);

  const trackedFeatures = adaptTaskSummariesToFeatures(tasks);

  return {
    trackedFeatures,
    loading,
    error: error ? mapSidebarError(error) : null,
    reload,
  };
}
