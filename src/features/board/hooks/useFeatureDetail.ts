"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getFeature, getFeatureTask } from "@/services/workflow-backend/client";
import type { FeatureDetail, TaskDetail, ApiError } from "@/services/workflow-backend/types";

export type UseFeatureDetailResult = {
  feature: FeatureDetail | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
};

export function useFeatureDetail(
  workspaceId: string | null,
  featureId: string | null,
): UseFeatureDetailResult {
  const [feature, setFeature] = useState<FeatureDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);
  const requestId = useRef(0);

  const reload = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!workspaceId || !featureId) {
      setFeature(null);
      setLoading(false);
      setError(null);
      return;
    }

    const id = ++requestId.current;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getFeature(workspaceId, featureId)
      .then((detail) => {
        if (cancelled || requestId.current !== id) return;
        setFeature(detail);
        setLoading(false);
      })
      .catch((err: ApiError) => {
        if (cancelled || requestId.current !== id) return;
        setError(err);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, featureId, tick]);

  return { feature, loading, error, reload };
}

export type UseFeatureTaskResult = {
  task: TaskDetail | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
};

export function useFeatureTask(
  workspaceId: string | null,
  featureId: string | null,
  taskId: string | null,
): UseFeatureTaskResult {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);
  const requestId = useRef(0);

  const reload = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!workspaceId || !featureId || !taskId) {
      setTask(null);
      setLoading(false);
      setError(null);
      return;
    }

    const id = ++requestId.current;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getFeatureTask(workspaceId, featureId, taskId)
      .then((detail) => {
        if (cancelled || requestId.current !== id) return;
        setTask(detail);
        setLoading(false);
      })
      .catch((err: ApiError) => {
        if (cancelled || requestId.current !== id) return;
        setError(err);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, featureId, taskId, tick]);

  return { task, loading, error, reload };
}
