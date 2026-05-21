"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getWorkspace } from "@/services/workflow-backend";
import type { WorkspaceDetail } from "@/services/workflow-backend";
import type { ParsedFeature } from "@/services/yaml-parser";
import { adaptWorkspaceDetail } from "@/features/workspaces/lib/workspaceAdapter";
import type { BoardLoadError } from "../types";


export type UseBoardDataResult = {
  features: ParsedFeature[];
  loading: boolean;
  error: BoardLoadError | null;
  reload: () => void;
};

export type UseBoardDataOptions = {
  initialData?: WorkspaceDetail;
};

function mapApiError(err: unknown): BoardLoadError {
  if (err && typeof err === "object" && "code" in err) {
    const e = err as { code: string; message: string; retryable?: boolean };
    const retryable = e.retryable;
    if (e.code === "DATABASE_NOT_FOUND" || e.code === "GITHUB_NOT_FOUND") {
      return { kind: "not_found", message: e.message, retryable };
    }
    if (e.code === "GITHUB_UNAUTHORIZED") {
      return { kind: "access_denied", message: e.message, retryable };
    }
    return { kind: "network_error", message: e.message, retryable };
  }
  if (err instanceof Error) {
    return { kind: "network_error", message: err.message };
  }
  return { kind: "network_error", message: "Unknown error" };
}

export function useBoardData(
  workspaceId: string | null,
  options: UseBoardDataOptions = {},
): UseBoardDataResult {
  const [features, setFeatures] = useState<ParsedFeature[]>(() =>
    options.initialData ? adaptWorkspaceDetail(options.initialData) : [],
  );
  const [loading, setLoading] = useState<boolean>(
    workspaceId !== null && !options.initialData,
  );
  const [error, setError] = useState<BoardLoadError | null>(null);
  const [tick, setTick] = useState(0);
  const requestId = useRef(0);

  const reload = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  // When initialData changes (e.g. workspace synced), update features immediately
  const prevInitialDataRef = useRef<WorkspaceDetail | undefined>(options.initialData);
  useEffect(() => {
    const next = options.initialData;
    if (!next) return;
    if (next === prevInitialDataRef.current) return;
    prevInitialDataRef.current = next;
    setFeatures(adaptWorkspaceDetail(next));
    setLoading(false);
    setError(null);
  }, [options.initialData]);

  useEffect(() => {
    if (!workspaceId) {
      setFeatures([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (tick === 0 && options.initialData) {
      setFeatures(adaptWorkspaceDetail(options.initialData));
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
        setError(mapApiError(err));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, tick]);

  return { features, loading, error, reload };
}
