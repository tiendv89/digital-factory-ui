"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getWorkspaceTask } from "@/services/workflow-backend/client";
import type { TaskDetail, ApiError } from "@/services/workflow-backend/types";

export type UseWorkspaceTaskResult = {
  task: TaskDetail | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
};

export function useWorkspaceTask(
  workspaceId: string | null,
  taskId: string | null,
): UseWorkspaceTaskResult {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);
  const requestId = useRef(0);

  const reload = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!workspaceId || !taskId) {
      setTask(null);
      setLoading(false);
      setError(null);
      return;
    }

    const id = ++requestId.current;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getWorkspaceTask(workspaceId, taskId)
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
  }, [workspaceId, taskId, tick]);

  return { task, loading, error, reload };
}
