"use client";

import { useEffect, useRef, useState } from "react";
import {
  searchWorkspaceTasks,
  buildTaskParams,
  type TaskSearchParams,
} from "@/services/workflow-backend";
import { adaptTaskSummariesToFeatures } from "@/features/workspaces/lib/workspaceAdapter";
import type { ParsedFeature } from "@/services/yaml-parser";
import type { BoardLoadError } from "../types";

const DEBOUNCE_MS = 300;

function isEmptyParams(params: TaskSearchParams): boolean {
  return !params.task_id && !params.title && !params.status;
}

export type UseBackendTaskSearchResult = {
  results: ParsedFeature[] | null;
  searching: boolean;
  searchError: BoardLoadError | null;
};

export function useBackendTaskSearch(
  workspaceId: string | null,
  params: TaskSearchParams,
): UseBackendTaskSearchResult {
  const [results, setResults] = useState<ParsedFeature[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<BoardLoadError | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!workspaceId || isEmptyParams(params)) {
      setResults(null);
      setSearching(false);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const id = ++requestIdRef.current;
      setSearching(true);
      setSearchError(null);

      try {
        const tasks = await searchWorkspaceTasks(workspaceId, buildTaskParams(params));
        if (cancelled || requestIdRef.current !== id) return;
        setResults(adaptTaskSummariesToFeatures(tasks));
        setSearching(false);
      } catch (err: unknown) {
        if (cancelled || requestIdRef.current !== id) return;
        const e = err as { code?: string; message?: string; retryable?: boolean };
        setSearchError({
          kind: "network_error",
          message: e.message ?? "Task search failed",
          retryable: e.retryable,
        });
        setResults([]);
        setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [workspaceId, params.task_id, params.title, params.status]);

  return { results, searching, searchError };
}
