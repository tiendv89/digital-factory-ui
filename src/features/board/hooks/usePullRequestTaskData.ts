"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GitHubClient } from "@/services/github";
import type { ParsedFeature } from "@/services/yaml-parser";
import type { StoredWorkspace } from "@/types/workspace";
import {
  BoardLoadFailure,
  fetchPullRequestTaskData,
  mapClientError,
  type BoardDataClient,
} from "../data/load-board-data";
import type { BoardLoadError } from "../types";

export type UsePullRequestTaskDataResult = {
  trackedFeatures: ParsedFeature[];
  loading: boolean;
  error: BoardLoadError | null;
  reload: () => void;
};

export type UsePullRequestTaskDataOptions = {
  clientFactory?: (workspace: StoredWorkspace) => BoardDataClient;
};

const defaultClientFactory = (workspace: StoredWorkspace): BoardDataClient =>
  new GitHubClient({
    owner: workspace.owner,
    repo: workspace.repo,
    pat: workspace.pat,
  });

export function usePullRequestTaskData(
  workspace: StoredWorkspace | null,
  options: UsePullRequestTaskDataOptions = {},
): UsePullRequestTaskDataResult {
  const [trackedFeatures, setTrackedFeatures] = useState<ParsedFeature[]>([]);
  const [loading, setLoading] = useState<boolean>(workspace !== null);
  const [error, setError] = useState<BoardLoadError | null>(null);
  const [tick, setTick] = useState(0);
  const requestId = useRef(0);

  const factory = options.clientFactory ?? defaultClientFactory;

  const reload = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!workspace) {
      setTrackedFeatures([]);
      setLoading(false);
      setError(null);
      return;
    }

    const id = ++requestId.current;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const client = factory(workspace);
    fetchPullRequestTaskData(client)
      .then((data) => {
        if (cancelled || requestId.current !== id) return;
        setTrackedFeatures(data);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled || requestId.current !== id) return;
        const boardError =
          err instanceof BoardLoadFailure ? err.error : mapClientError(err);
        setError(boardError);
        setTrackedFeatures([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [workspace, tick, factory]);

  return { trackedFeatures, loading, error, reload };
}
