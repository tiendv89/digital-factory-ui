"use client";

import { useState } from "react";
import type { ParsedFeature } from "@/services/yaml-parser";
import type { BoardLoadError } from "../types";

export type UsePullRequestTaskDataResult = {
  trackedFeatures: ParsedFeature[];
  loading: boolean;
  error: BoardLoadError | null;
  reload: () => void;
};

// Sidebar active-task data is owned by T3 (independent backend query).
// For now, return empty data so the sidebar renders without GitHub API calls.
export function usePullRequestTaskData(): UsePullRequestTaskDataResult {
  const [trackedFeatures] = useState<ParsedFeature[]>([]);

  return {
    trackedFeatures,
    loading: false,
    error: null,
    reload: () => {},
  };
}
