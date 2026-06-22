"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { workspaceKeys } from "@/constants/query-keys";
import {
  type ApiError,
  getWorkspace,
  importWorkspace as apiImportWorkspace,
  type ImportWorkspaceRequest,
  listWorkspaces,
  syncWorkspace as apiSyncWorkspace,
  type WorkspaceDetail,
  type WorkspaceSummary,
} from "@/services/workflow-backend";
import { useBoardStore } from "@/stores/board";
import { useLocalWorkspaceStore } from "@/stores/workspace";
import { createRequestSequence } from "@/utils/request-sequence";
import { addFeatureTab, addTaskTab, createTabSessionId, getFeatureTabHref, getTaskTabHref, removeFeatureTab, removeTaskTab } from "@/utils/workspaces/tab-state";

export type TaskTabEntry = {
  sessionId: string;
  workspaceId: string;
  taskId: string;
  taskName: string;
  title: string;
  featureId?: string;
  featureName?: string;
  /** When set, closing this task tab should reactivate the parent feature tab. */
  parentFeatureTabSessionId?: string;
};

export type FeatureTabEntry = {
  sessionId: string;
  workspaceId: string;
  featureId: string;
  featureName: string;
  title: string;
};

export type WorkspaceSurface = "board" | "task-tab" | "feature-tab";

export type TabOpenOptions = {
  forceNewSession?: boolean;
};

export type WorkspaceContextValue = {
  summaries: WorkspaceSummary[];
  selectedWorkspaceId: string | null;
  activeWorkspace: WorkspaceDetail | null;
  loadingWorkspace: boolean;
  workspaceError: ApiError | null;
  importingWorkspace: boolean;
  importError: ApiError | null;
  syncingWorkspace: boolean;
  syncError: ApiError | null;
  refreshingWorkspace: boolean;

  selectWorkspace: (workspaceId: string) => void;
  clearWorkspace: () => void;
  addWorkspace: (detail: WorkspaceDetail) => void;
  removeWorkspace: (workspaceId: string) => void;
  importWorkspace: (body: ImportWorkspaceRequest) => Promise<void>;
  clearImportError: () => void;
  syncCurrentWorkspace: () => Promise<void>;
  clearSyncError: () => void;
  refreshWorkspace: () => void;

  activeSurface: WorkspaceSurface;
  openTaskTabs: TaskTabEntry[];
  activeTaskTabId: string | null;
  openTaskTab: (entry: Omit<TaskTabEntry, "sessionId" | "workspaceId">, options?: TabOpenOptions) => void;
  closeTaskTab: (sessionId: string) => void;
  activateTaskTab: (sessionId: string) => void;
  markTaskTabActive: (sessionId: string) => void;
  openFeatureTabs: FeatureTabEntry[];
  activeFeatureTabId: string | null;
  openFeatureTab: (entry: Omit<FeatureTabEntry, "sessionId" | "workspaceId">, options?: TabOpenOptions) => void;
  closeFeatureTab: (sessionId: string) => void;
  activateFeatureTab: (sessionId: string) => void;
  markFeatureTabActive: (sessionId: string) => void;
  goToBoard: () => void;
};

export type WorkspaceActionsContextValue = Pick<
  WorkspaceContextValue,
  "syncCurrentWorkspace" | "syncingWorkspace" | "syncError" | "refreshWorkspace" | "refreshingWorkspace" | "openTaskTab" | "openFeatureTab"
>;

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const WorkspaceActionsContext = createContext<WorkspaceActionsContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const selectedWorkspaceId = useLocalWorkspaceStore((s) => s.selectedWorkspaceId);
  const setStoredSelectedId = useLocalWorkspaceStore((s) => s.setSelectedWorkspaceId);

  const [summaries, setSummaries] = useState<WorkspaceSummary[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceDetail | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<ApiError | null>(null);
  const [importingWorkspace, setImportingWorkspace] = useState(false);
  const [importError, setImportError] = useState<ApiError | null>(null);
  const [syncingWorkspace, setSyncingWorkspace] = useState(false);
  const [syncError, setSyncError] = useState<ApiError | null>(null);
  const [refreshingWorkspace, setRefreshingWorkspace] = useState(false);

  const [activeSurface, setActiveSurface] = useState<WorkspaceSurface>("board");
  const [openTaskTabs, setOpenTaskTabs] = useState<TaskTabEntry[]>([]);
  const [activeTaskTabId, setActiveTaskTabId] = useState<string | null>(null);
  const [openFeatureTabs, setOpenFeatureTabs] = useState<FeatureTabEntry[]>([]);
  const [activeFeatureTabId, setActiveFeatureTabId] = useState<string | null>(null);
  const openTaskTabsRef = useRef(openTaskTabs);
  const openFeatureTabsRef = useRef(openFeatureTabs);
  const loadWorkspaceSequenceRef = useRef(createRequestSequence());

  useEffect(() => {
    openTaskTabsRef.current = openTaskTabs;
  }, [openTaskTabs]);

  useEffect(() => {
    openFeatureTabsRef.current = openFeatureTabs;
  }, [openFeatureTabs]);

  const loadWorkspace = useCallback((workspaceId: string) => {
    const requestId = loadWorkspaceSequenceRef.current.next();
    setLoadingWorkspace(true);
    setWorkspaceError(null);
    getWorkspace(workspaceId)
      .then((detail) => {
        if (!loadWorkspaceSequenceRef.current.isCurrent(requestId)) return;
        setActiveWorkspace(detail);
        setLoadingWorkspace(false);
      })
      .catch((err: ApiError) => {
        if (!loadWorkspaceSequenceRef.current.isCurrent(requestId)) return;
        setWorkspaceError(err);
        setLoadingWorkspace(false);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    listWorkspaces()
      .then((list) => {
        if (cancelled) return;
        setSummaries(list);

        const storedId = useLocalWorkspaceStore.getState().selectedWorkspaceId;
        const bootstrapId = list.find((s) => s.id === storedId)?.id ?? list[0]?.id ?? null;

        if (bootstrapId) {
          setStoredSelectedId(bootstrapId);
          loadWorkspace(bootstrapId);
        } else {
          setLoadingWorkspace(false);
        }
      })
      .catch((err: ApiError) => {
        if (cancelled) return;
        setWorkspaceError(err);
        setLoadingWorkspace(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadWorkspace, setStoredSelectedId]);

  const resetTabs = useCallback(() => {
    setOpenTaskTabs([]);
    setOpenFeatureTabs([]);
    setActiveTaskTabId(null);
    setActiveFeatureTabId(null);
    setActiveSurface("board");
    useBoardStore.getState().clearBoardPrefs();
  }, []);

  const addWorkspace = useCallback(
    (detail: WorkspaceDetail) => {
      const summary: WorkspaceSummary = {
        id: detail.id,
        organization_id: detail.organization_id,
        name: detail.name,
        slug: detail.slug,
        repo_url: detail.repo_url,
        source_state: detail.source_state,
        updated_at: detail.updated_at,
      };
      setSummaries((prev) => (prev.find((s) => s.id === detail.id) ? prev : [...prev, summary]));
      setStoredSelectedId(detail.id);
      setActiveWorkspace(detail);
      loadWorkspaceSequenceRef.current.next();
      resetTabs();
    },
    [setStoredSelectedId, resetTabs],
  );

  const selectWorkspace = useCallback(
    (workspaceId: string) => {
      setStoredSelectedId(workspaceId);
      setActiveWorkspace(null);
      resetTabs();
      useLocalWorkspaceStore.getState().setLastVisitedFeatureId(null);
      loadWorkspace(workspaceId);
    },
    [loadWorkspace, setStoredSelectedId, resetTabs],
  );

  const clearWorkspace = useCallback(() => {
    setStoredSelectedId(null);
    setActiveWorkspace(null);
    setWorkspaceError(null);
    setLoadingWorkspace(false);
    loadWorkspaceSequenceRef.current.next();
    resetTabs();
    useLocalWorkspaceStore.getState().setLastVisitedFeatureId(null);
    router.push("/board");
  }, [setStoredSelectedId, resetTabs, router]);

  const removeWorkspace = useCallback(
    (workspaceId: string) => {
      const remaining = summaries.filter((s) => s.id !== workspaceId);
      setSummaries(remaining);
      if (selectedWorkspaceId === workspaceId) {
        const next = remaining[0];
        if (next) {
          selectWorkspace(next.id);
        } else {
          setStoredSelectedId(null);
          setActiveWorkspace(null);
          resetTabs();
          router.push("/board");
        }
      }
    },
    [summaries, selectedWorkspaceId, selectWorkspace, setStoredSelectedId, resetTabs, router],
  );

  const importWorkspaceFn = useCallback(
    async (body: ImportWorkspaceRequest) => {
      setImportingWorkspace(true);
      setImportError(null);
      try {
        const detail = await apiImportWorkspace(body);
        addWorkspace(detail);
      } catch (err) {
        setImportError(err as ApiError);
        throw err;
      } finally {
        setImportingWorkspace(false);
      }
    },
    [addWorkspace],
  );

  const clearImportError = useCallback(() => {
    setImportError(null);
  }, []);

  const syncCurrentWorkspace = useCallback(async () => {
    if (!selectedWorkspaceId) return;
    setSyncingWorkspace(true);
    setSyncError(null);
    try {
      const detail = await apiSyncWorkspace(selectedWorkspaceId);
      setActiveWorkspace(detail);
      queryClient.setQueryData(workspaceKeys.detail(selectedWorkspaceId), detail);
      queryClient.invalidateQueries({
        queryKey: ["workspace", selectedWorkspaceId, "sidebar-tasks"],
      });
    } catch (err) {
      const apiError = err as ApiError;
      setSyncError(apiError);
      throw err;
    } finally {
      setSyncingWorkspace(false);
    }
  }, [queryClient, selectedWorkspaceId]);

  const clearSyncError = useCallback(() => {
    setSyncError(null);
  }, []);

  const refreshWorkspace = useCallback(() => {
    if (!selectedWorkspaceId) return;
    const requestId = loadWorkspaceSequenceRef.current.next();
    setRefreshingWorkspace(true);
    getWorkspace(selectedWorkspaceId)
      .then((detail) => {
        if (!loadWorkspaceSequenceRef.current.isCurrent(requestId)) return;
        setActiveWorkspace(detail);
        setWorkspaceError(null);
        setRefreshingWorkspace(false);
      })
      .catch((err: ApiError) => {
        if (!loadWorkspaceSequenceRef.current.isCurrent(requestId)) return;
        setWorkspaceError(err);
        setRefreshingWorkspace(false);
      });
  }, [selectedWorkspaceId]);

  useEffect(() => {
    if (!selectedWorkspaceId) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    function startPolling() {
      intervalId = setInterval(refreshWorkspace, 30_000);
    }

    function stopPolling() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshWorkspace();
        startPolling();
      } else {
        stopPolling();
      }
    }

    if (document.visibilityState === "visible") {
      startPolling();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [selectedWorkspaceId, refreshWorkspace]);

  const openTaskTab = useCallback(
    (entry: Omit<TaskTabEntry, "sessionId" | "workspaceId">, options?: TabOpenOptions) => {
      const workspaceId = selectedWorkspaceId ?? activeWorkspace?.id;
      if (!workspaceId) return;
      if (!options?.forceNewSession) {
        const existing = openTaskTabsRef.current.find((tab) => tab.taskId === entry.taskId && tab.workspaceId === workspaceId);
        if (existing) {
          setActiveTaskTabId(existing.sessionId);
          setActiveSurface("task-tab");
          router.push(getTaskTabHref(existing));
          return;
        }
      }
      const tab: TaskTabEntry = {
        ...entry,
        workspaceId,
        sessionId: createTabSessionId("task"),
      };
      setOpenTaskTabs((prev) => addTaskTab(prev, tab));
      setActiveTaskTabId(tab.sessionId);
      setActiveSurface("task-tab");
      router.push(getTaskTabHref(tab));
    },
    [activeWorkspace?.id, router, selectedWorkspaceId],
  );

  const closeTaskTab = useCallback(
    (sessionId: string) => {
      const tab = openTaskTabsRef.current.find((t) => t.sessionId === sessionId);
      setOpenTaskTabs((prev) => removeTaskTab(prev, sessionId));
      if (activeTaskTabId === sessionId) {
        setActiveTaskTabId(null);
        if (tab?.parentFeatureTabSessionId) {
          const parentTab = openFeatureTabsRef.current.find((ft) => ft.sessionId === tab.parentFeatureTabSessionId);
          if (parentTab) {
            setActiveFeatureTabId(parentTab.sessionId);
            setActiveSurface("feature-tab");
            router.push(getFeatureTabHref(parentTab));
            return;
          }
        }
        setActiveSurface("board");
        router.push("/board");
      }
    },
    [activeTaskTabId, router],
  );

  const activateTaskTab = useCallback(
    (sessionId: string) => {
      const tab = openTaskTabs.find((entry) => entry.sessionId === sessionId);
      if (!tab) return;
      setActiveTaskTabId(sessionId);
      setActiveSurface("task-tab");
      router.push(getTaskTabHref(tab));
    },
    [openTaskTabs, router],
  );

  const markTaskTabActive = useCallback((taskId: string) => {
    const tab = openTaskTabsRef.current.find((t) => t.taskId === taskId);
    if (tab) {
      setActiveTaskTabId(tab.sessionId);
    }
    setActiveFeatureTabId(null);
    setActiveSurface("task-tab");
  }, []);

  const openFeatureTab = useCallback(
    (entry: Omit<FeatureTabEntry, "sessionId" | "workspaceId">, options?: TabOpenOptions) => {
      const workspaceId = selectedWorkspaceId ?? activeWorkspace?.id;
      if (!workspaceId) return;
      if (!options?.forceNewSession) {
        const existing = openFeatureTabsRef.current.find((tab) => tab.featureId === entry.featureId && tab.workspaceId === workspaceId);
        if (existing) {
          setActiveFeatureTabId(existing.sessionId);
          setActiveSurface("feature-tab");
          router.push(getFeatureTabHref(existing));
          return;
        }
      }
      const tab: FeatureTabEntry = {
        ...entry,
        workspaceId,
        sessionId: createTabSessionId("feature"),
      };
      setOpenFeatureTabs((prev) => addFeatureTab(prev, tab));
      setActiveFeatureTabId(tab.sessionId);
      setActiveSurface("feature-tab");
      router.push(getFeatureTabHref(tab));
    },
    [activeWorkspace?.id, router, selectedWorkspaceId],
  );

  const closeFeatureTab = useCallback(
    (sessionId: string) => {
      setOpenFeatureTabs((prev) => removeFeatureTab(prev, sessionId));
      if (activeFeatureTabId === sessionId) {
        setActiveFeatureTabId(null);
        setActiveSurface("board");
        router.push("/board");
      }
    },
    [activeFeatureTabId, router],
  );

  const activateFeatureTab = useCallback(
    (sessionId: string) => {
      const tab = openFeatureTabs.find((entry) => entry.sessionId === sessionId);
      if (!tab) return;
      setActiveFeatureTabId(sessionId);
      setActiveSurface("feature-tab");
      router.push(getFeatureTabHref(tab));
    },
    [openFeatureTabs, router],
  );

  const markFeatureTabActive = useCallback((featureId: string) => {
    const tab = openFeatureTabsRef.current.find((t) => t.featureId === featureId);
    if (tab) {
      setActiveFeatureTabId(tab.sessionId);
    }
    setActiveTaskTabId(null);
    setActiveSurface("feature-tab");
  }, []);

  const goToBoard = useCallback(() => {
    setActiveSurface("board");
    setActiveTaskTabId(null);
    setActiveFeatureTabId(null);
    router.push("/board");
  }, [router]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      summaries,
      selectedWorkspaceId,
      activeWorkspace,
      loadingWorkspace,
      workspaceError,
      importingWorkspace,
      importError,
      syncingWorkspace,
      syncError,
      refreshingWorkspace,
      selectWorkspace,
      clearWorkspace,
      addWorkspace,
      removeWorkspace,
      importWorkspace: importWorkspaceFn,
      clearImportError,
      syncCurrentWorkspace,
      clearSyncError,
      refreshWorkspace,
      activeSurface,
      openTaskTabs,
      activeTaskTabId,
      openTaskTab,
      closeTaskTab,
      activateTaskTab,
      markTaskTabActive,
      openFeatureTabs,
      activeFeatureTabId,
      openFeatureTab,
      closeFeatureTab,
      activateFeatureTab,
      markFeatureTabActive,
      goToBoard,
    }),
    [
      summaries,
      selectedWorkspaceId,
      activeWorkspace,
      loadingWorkspace,
      workspaceError,
      importingWorkspace,
      importError,
      syncingWorkspace,
      syncError,
      refreshingWorkspace,
      selectWorkspace,
      clearWorkspace,
      addWorkspace,
      removeWorkspace,
      importWorkspaceFn,
      clearImportError,
      syncCurrentWorkspace,
      clearSyncError,
      refreshWorkspace,
      activeSurface,
      openTaskTabs,
      activeTaskTabId,
      openTaskTab,
      closeTaskTab,
      activateTaskTab,
      markTaskTabActive,
      openFeatureTabs,
      activeFeatureTabId,
      openFeatureTab,
      closeFeatureTab,
      activateFeatureTab,
      markFeatureTabActive,
      goToBoard,
    ],
  );

  const actionsValue = useMemo<WorkspaceActionsContextValue>(
    () => ({
      syncCurrentWorkspace,
      syncingWorkspace,
      syncError,
      refreshWorkspace,
      refreshingWorkspace,
      openTaskTab,
      openFeatureTab,
    }),
    [syncCurrentWorkspace, syncingWorkspace, syncError, refreshWorkspace, refreshingWorkspace, openTaskTab, openFeatureTab],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      <WorkspaceActionsContext.Provider value={actionsValue}>{children}</WorkspaceActionsContext.Provider>
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspaceContext must be used within a WorkspaceProvider");
  }
  return ctx;
}

export function useWorkspaceActionsContext(): WorkspaceActionsContextValue {
  const ctx = useContext(WorkspaceActionsContext);
  if (!ctx) {
    throw new Error("useWorkspaceActionsContext must be used within a WorkspaceProvider");
  }
  return ctx;
}
