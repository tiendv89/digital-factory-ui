"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getWorkspace } from "@/services/workflow-backend";
import type { WorkspaceDetail } from "@/services/workflow-backend";
import type { ParsedFeature } from "@/services/yaml-parser";
import { adaptWorkspaceDetail } from "@/features/workspaces/lib/workspaceAdapter";
import type { BoardLoadError } from "../types";
import { mapApiBoardError } from "../lib/error-utils";

export type UseBoardDataResult = {
  features: ParsedFeature[];
  loading: boolean;
  error: BoardLoadError | null;
  reload: () => void;
};

export type UseBoardDataOptions = {
  initialData?: WorkspaceDetail;
};

export function useBoardData(
  workspaceId: string | null,
  options: UseBoardDataOptions = {},
): UseBoardDataResult {
  const { initialData } = options;
  const [features, setFeatures] = useState<ParsedFeature[]>(() =>
    initialData ? adaptWorkspaceDetail(initialData) : [],
  );
  const [loading, setLoading] = useState<boolean>(
    workspaceId !== null && !initialData,
  );
  const [error, setError] = useState<BoardLoadError | null>(null);
  const [tick, setTick] = useState(0);
  const requestId = useRef(0);

  const reload = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  // When initialData changes (e.g. workspace synced), update features immediately
  const prevInitialDataRef = useRef<WorkspaceDetail | undefined>(initialData);
  useEffect(() => {
    const next = initialData;
    if (!next) return;
    if (next === prevInitialDataRef.current) return;
    prevInitialDataRef.current = next;
    setFeatures(adaptWorkspaceDetail(next));
    setLoading(false);
    setError(null);
  }, [initialData]);

  useEffect(() => {
    if (!workspaceId) {
      setFeatures([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (tick === 0 && initialData) {
      setFeatures(adaptWorkspaceDetail(initialData));
      setLoading(false);
      return;
    }

    const id = ++requestId.current;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getWorkspace(workspaceId)
      .then((detail) => {
        if (cancelled || requestId.current !== id) return;
        setFeatures(adaptWorkspaceDetail(detail));
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled || requestId.current !== id) return;
        setError(mapApiBoardError(err));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, tick, initialData]);

  return { features, loading, error, reload };
}
