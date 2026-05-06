"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GitHubClient } from "@/services/github";
import type { ParsedFeature } from "@/services/yaml-parser";
import type { StoredWorkspace } from "@/types/workspace";
import {
  BoardLoadFailure,
  fetchBoardData,
  mapClientError,
  type BoardDataClient,
} from "../data/load-board-data";
import type { BoardLoadError } from "../types";

export type UseBoardDataResult = {
  features: ParsedFeature[];
  loading: boolean;
  error: BoardLoadError | null;
  reload: () => void;
};

export type UseBoardDataOptions = {
  clientFactory?: (workspace: StoredWorkspace) => BoardDataClient;
};

const defaultClientFactory = (workspace: StoredWorkspace): BoardDataClient =>
  new GitHubClient({
    owner: workspace.owner,
    repo: workspace.repo,
    pat: workspace.pat,
  });

export function useBoardData(
  workspace: StoredWorkspace | null,
  options: UseBoardDataOptions = {},
): UseBoardDataResult {
  const [features, setFeatures] = useState<ParsedFeature[]>([]);
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
      setFeatures([]);
      setLoading(false);
      setError(null);
      return;
    }

    const id = ++requestId.current;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const client = factory(workspace);
    fetchBoardData(client)
      .then((data) => {
        if (cancelled || requestId.current !== id) return;
        setFeatures(data);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled || requestId.current !== id) return;
        const boardError =
          err instanceof BoardLoadFailure ? err.error : mapClientError(err);
        setError(boardError);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [workspace, tick, factory]);

  return { features, loading, error, reload };
}
