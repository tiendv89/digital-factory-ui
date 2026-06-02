"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  getWorkspace,
  importWorkspace as apiImportWorkspace,
  syncWorkspace as apiSyncWorkspace,
  type ApiError,
  type ImportWorkspaceRequest,
  type LocalWorkspaceSummary,
  type WorkspaceDetail,
} from "@/services/workflow-backend";
import { buildImportLocalSummary } from "@/features/workspaces/lib/workspaceAdapter";
import {
  getLocalWorkspaceSummaries,
  getSelectedWorkspaceId,
  clearSelectedWorkspaceId,
  resolveBootstrapWorkspaceId,
  saveLocalWorkspaceSummary,
  removeLocalWorkspaceSummary,
  setSelectedWorkspaceId,
} from "@/services/local-workspace-store";
import {
  addTaskTab,
  removeTaskTab,
  addFeatureTab,
  removeFeatureTab,
  createTabSessionId,
  getTaskTabHref,
  getFeatureTabHref,
} from "@/features/workspaces/lib/tabState";
import { createRequestSequence } from "@/lib/request-sequence";
import {
  clearStatusFilter,
  clearFeatureStatusFilter,
  clearBoardMode,
} from "@/features/board/lib/status-filter-store";
import { useQueryClient } from "@tanstack/react-query";
import { workspaceKeys } from "@/lib/query-keys";

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
  summaries: LocalWorkspaceSummary[];
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
  importWorkspace: (body: ImportWorkspaceRequest) => Promise<void>;
  clearImportError: () => void;
  removeLocalSummary: (workspaceId: string) => void;
  syncCurrentWorkspace: () => Promise<void>;
  clearSyncError: () => void;
  refreshWorkspace: () => void;

  activeSurface: WorkspaceSurface;
  openTaskTabs: TaskTabEntry[];
  activeTaskTabId: string | null;
  openTaskTab: (
    entry: Omit<TaskTabEntry, "sessionId" | "workspaceId">,
    options?: TabOpenOptions,
  ) => void;
  closeTaskTab: (sessionId: string) => void;
  activateTaskTab: (sessionId: string) => void;
  markTaskTabActive: (sessionId: string) => void;
  openFeatureTabs: FeatureTabEntry[];
  activeFeatureTabId: string | null;
  openFeatureTab: (
    entry: Omit<FeatureTabEntry, "sessionId" | "workspaceId">,
    options?: TabOpenOptions,
  ) => void;
  closeFeatureTab: (sessionId: string) => void;
  activateFeatureTab: (sessionId: string) => void;
  markFeatureTabActive: (sessionId: string) => void;
  goToBoard: () => void;
};

export type WorkspaceActionsContextValue = Pick<
  WorkspaceContextValue,
  | "syncCurrentWorkspace"
  | "syncingWorkspace"
  | "syncError"
  | "refreshWorkspace"
  | "refreshingWorkspace"
  | "openTaskTab"
  | "openFeatureTab"
>;

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const WorkspaceActionsContext =
  createContext<WorkspaceActionsContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [summaries, setSummaries] = useState<LocalWorkspaceSummary[]>(() =>
    getLocalWorkspaceSummaries(),
  );
  const [selectedWorkspaceId, setSelectedWorkspaceIdState] = useState<
    string | null
  >(() => getSelectedWorkspaceId());
  const [activeWorkspace, setActiveWorkspace] =
    useState<WorkspaceDetail | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(() => {
    const storedSummaries = getLocalWorkspaceSummaries();
    const storedId = getSelectedWorkspaceId();
    return Boolean(resolveBootstrapWorkspaceId(storedSummaries, storedId));
  });
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
  const [activeFeatureTabId, setActiveFeatureTabId] = useState<string | null>(
    null,
  );
  const openTaskTabsRef = useRef(openTaskTabs);
  const openFeatureTabsRef = useRef(openFeatureTabs);
  const loadWorkspaceSequenceRef = useRef(createRequestSequence());
  const didBootstrapRef = useRef(false);

  useEffect(() => {
    openTaskTabsRef.current = openTaskTabs;
  }, [openTaskTabs]);

  useEffect(() => {
    openFeatureTabsRef.current = openFeatureTabs;
  }, [openFeatureTabs]);

  const isWorkspaceNotFound = useCallback((err: ApiError) => {
    return (
      err.code === "DATABASE_NOT_FOUND" ||
      err.code === "GITHUB_NOT_FOUND" ||
      err.code === "WORKSPACE_NOT_FOUND"
    );
  }, []);

  const handleMissingWorkspace = useCallback(
    (workspaceId: string) => {
      removeLocalWorkspaceSummary(workspaceId);
      const updatedSummaries = getLocalWorkspaceSummaries();
      setSummaries(updatedSummaries);

      if (selectedWorkspaceId === workspaceId) {
        clearSelectedWorkspaceId();
        setSelectedWorkspaceIdState(null);
      }

      setActiveWorkspace(null);
      setWorkspaceError(null);
      setLoadingWorkspace(false);
      router.replace("/admin/connect");
    },
    [router, selectedWorkspaceId],
  );

  const loadWorkspace = useCallback(
    (workspaceId: string) => {
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
          if (isWorkspaceNotFound(err)) {
            handleMissingWorkspace(workspaceId);
            return;
          }
          setWorkspaceError(err);
          setLoadingWorkspace(false);
        });
    },
    [handleMissingWorkspace, isWorkspaceNotFound],
  );

  useEffect(() => {
    if (didBootstrapRef.current) return;
    didBootstrapRef.current = true;

    const storedSummaries = getLocalWorkspaceSummaries();
    const storedId = getSelectedWorkspaceId();
    setSummaries(storedSummaries);

    const workspaceId = resolveBootstrapWorkspaceId(storedSummaries, storedId);

    if (workspaceId) {
      setSelectedWorkspaceIdState(workspaceId);
      loadWorkspace(workspaceId);
    } else {
      setLoadingWorkspace(false);
    }
  }, [loadWorkspace]);

  const selectWorkspace = useCallback(
    (workspaceId: string) => {
      setSelectedWorkspaceIdState(workspaceId);
      setSelectedWorkspaceId(workspaceId);
      setActiveWorkspace(null);

      // Close all open tabs — stale tabs from the previous workspace
      // must not survive a workspace switch.
      setOpenTaskTabs([]);
      setOpenFeatureTabs([]);
      setActiveTaskTabId(null);
      setActiveFeatureTabId(null);
      setActiveSurface("board");

      // Clear board-level persisted filter/mode state so the new
      // BoardProvider starts with factory defaults instead of stale
      // values from the previous workspace.
      clearStatusFilter();
      clearFeatureStatusFilter();
      clearBoardMode();

      const summary = summaries.find((s) => s.workspaceId === workspaceId);
      if (summary) {
        const updated: LocalWorkspaceSummary = {
          ...summary,
          last_opened_at: new Date().toISOString(),
        };
        saveLocalWorkspaceSummary(updated);
        setSummaries(getLocalWorkspaceSummaries());
      }

      loadWorkspace(workspaceId);
    },
    [summaries, loadWorkspace],
  );

  const importWorkspaceFn = useCallback(
    async (body: ImportWorkspaceRequest) => {
      setImportingWorkspace(true);
      setImportError(null);
      try {
        const detail = await apiImportWorkspace(body);

        const summary = buildImportLocalSummary(
          detail,
          body,
          new Date().toISOString(),
        );
        loadWorkspaceSequenceRef.current.next();
        saveLocalWorkspaceSummary(summary);
        setSelectedWorkspaceId(detail.id);
        setSummaries(getLocalWorkspaceSummaries());
        setSelectedWorkspaceIdState(detail.id);
        setActiveWorkspace(detail);
      } catch (err) {
        setImportError(err as ApiError);
        throw err;
      } finally {
        setImportingWorkspace(false);
      }
    },
    [],
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
      // Update board detail cache immediately with fresh sync data
      queryClient.setQueryData(workspaceKeys.detail(selectedWorkspaceId), detail);
      // Invalidate sidebar tasks so they refetch in the background
      queryClient.invalidateQueries({
        queryKey: ["workspace", selectedWorkspaceId, "sidebar-tasks"],
      });
    } catch (err) {
      const apiError = err as ApiError;
      if (isWorkspaceNotFound(apiError)) {
        handleMissingWorkspace(selectedWorkspaceId);
        return;
      }
      setSyncError(apiError);
      throw err;
    } finally {
      setSyncingWorkspace(false);
    }
  }, [handleMissingWorkspace, isWorkspaceNotFound, queryClient, selectedWorkspaceId]);

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
        if (isWorkspaceNotFound(err)) {
          handleMissingWorkspace(selectedWorkspaceId);
          setRefreshingWorkspace(false);
          return;
        }
        setWorkspaceError(err);
        setRefreshingWorkspace(false);
      });
  }, [handleMissingWorkspace, isWorkspaceNotFound, selectedWorkspaceId]);

  // 30s focus-aware background polling
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

  const removeLocalSummary = useCallback(
    (workspaceId: string) => {
      removeLocalWorkspaceSummary(workspaceId);
      setSummaries(getLocalWorkspaceSummaries());
      if (selectedWorkspaceId === workspaceId) {
        const remaining = getLocalWorkspaceSummaries();
        const next = remaining[0] ?? null;
        if (next) {
          setSelectedWorkspaceIdState(next.workspaceId);
          setSelectedWorkspaceId(next.workspaceId);
          loadWorkspace(next.workspaceId);
        } else {
          setSelectedWorkspaceIdState(null);
          setActiveWorkspace(null);
        }
      }
    },
    [selectedWorkspaceId, loadWorkspace],
  );

  const openTaskTab = useCallback(
    (
      entry: Omit<TaskTabEntry, "sessionId" | "workspaceId">,
      options?: TabOpenOptions,
    ) => {
      const workspaceId = selectedWorkspaceId ?? activeWorkspace?.id;
      if (!workspaceId) return;
      if (!options?.forceNewSession) {
        const existing = openTaskTabsRef.current.find(
          (tab) =>
            tab.taskId === entry.taskId && tab.workspaceId === workspaceId,
        );
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
      // Look up the tab being closed to check for parent feature tab context
      const tab = openTaskTabsRef.current.find(
        (t) => t.sessionId === sessionId,
      );
      setOpenTaskTabs((prev) => removeTaskTab(prev, sessionId));
      if (activeTaskTabId === sessionId) {
        setActiveTaskTabId(null);
        if (tab?.parentFeatureTabSessionId) {
          // Reactivate the parent feature tab instead of going to board
          const parentTab = openFeatureTabsRef.current.find(
            (ft) => ft.sessionId === tab.parentFeatureTabSessionId,
          );
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

  const markTaskTabActive = useCallback((sessionId: string) => {
    setActiveTaskTabId(sessionId);
    setActiveFeatureTabId(null);
    setActiveSurface("task-tab");
  }, []);

  const openFeatureTab = useCallback(
    (
      entry: Omit<FeatureTabEntry, "sessionId" | "workspaceId">,
      options?: TabOpenOptions,
    ) => {
      const workspaceId = selectedWorkspaceId ?? activeWorkspace?.id;
      if (!workspaceId) return;
      if (!options?.forceNewSession) {
        const existing = openFeatureTabsRef.current.find(
          (tab) =>
            tab.featureId === entry.featureId &&
            tab.workspaceId === workspaceId,
        );
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
      const tab = openFeatureTabs.find(
        (entry) => entry.sessionId === sessionId,
      );
      if (!tab) return;
      setActiveFeatureTabId(sessionId);
      setActiveSurface("feature-tab");
      router.push(getFeatureTabHref(tab));
    },
    [openFeatureTabs, router],
  );

  const markFeatureTabActive = useCallback((sessionId: string) => {
    setActiveFeatureTabId(sessionId);
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
      importWorkspace: importWorkspaceFn,
      clearImportError,
      removeLocalSummary,
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
      importWorkspaceFn,
      clearImportError,
      removeLocalSummary,
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
    [
      syncCurrentWorkspace,
      syncingWorkspace,
      syncError,
      refreshWorkspace,
      refreshingWorkspace,
      openTaskTab,
      openFeatureTab,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      <WorkspaceActionsContext.Provider value={actionsValue}>
        {children}
      </WorkspaceActionsContext.Provider>
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error(
      "useWorkspaceContext must be used within a WorkspaceProvider",
    );
  }
  return ctx;
}

export function useWorkspaceActionsContext(): WorkspaceActionsContextValue {
  const ctx = useContext(WorkspaceActionsContext);
  if (!ctx) {
    throw new Error(
      "useWorkspaceActionsContext must be used within a WorkspaceProvider",
    );
  }
  return ctx;
}
