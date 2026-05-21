"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  searchWorkspaceTasks,
  SIDEBAR_TASK_PARAMS,
  type ApiError,
  type TaskSummary,
} from "@/services/workflow-backend";

const POLL_INTERVAL_MS = 60_000;

export type UseSidebarTasksResult = {
  tasks: TaskSummary[];
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
};

export function useSidebarTasks(workspaceId: string | null): UseSidebarTasksResult {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);
  const requestIdRef = useRef(0);

  const reload = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!workspaceId) {
      setTasks([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const id = ++requestIdRef.current;
    setLoading(true);

    searchWorkspaceTasks(workspaceId, SIDEBAR_TASK_PARAMS)
      .then((result) => {
        if (cancelled || requestIdRef.current !== id) return;
        setTasks(result);
        setError(null);
        setLoading(false);
      })
      .catch((err: ApiError) => {
        if (cancelled || requestIdRef.current !== id) return;
        setError(err);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, tick]);

  // Poll independently
  const reloadRef = useRef(reload);
  useEffect(() => {
    reloadRef.current = reload;
  }, [reload]);

  useEffect(() => {
    if (!workspaceId) return;
    const id = setInterval(() => {
      reloadRef.current();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [workspaceId]);

  return { tasks, loading, error, reload };
}
