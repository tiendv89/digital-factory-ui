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
import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";
import type { WorkspaceDetail } from "@/services/workflow-backend";
import { useBoardData } from "../../hooks/useBoardData";
import { usePullRequestTaskData } from "../../hooks/usePullRequestTaskData";
import { useBackendFeatureSearch } from "../../hooks/useBackendFeatureSearch";
import { useBackendTaskSearch } from "../../hooks/useBackendTaskSearch";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import type {
  ActiveFilters,
  BoardLoadError,
  FeatureActiveFilters,
} from "../../types";
import {
  type BoardMode,
  getDefaultBoardMode,
  getDefaultFeatureStatusFilter,
  getDefaultStatusFilter,
  getStoredBoardMode,
  getStoredFeatureStatusFilter,
  getStoredStatusFilter,
  saveBoardMode,
  saveFeatureStatusFilter,
  saveStatusFilter,
} from "../../lib/status-filter-store";

export type SelectedTask = {
  task: ParsedTask;
  featureId: string;
  featureTitle: string;
} | null;

export type BoardContextValue = {
  workspaceDetail: WorkspaceDetail;
  features: ParsedFeature[];
  trackedFeatures: ParsedFeature[];
  loading: boolean;
  error: BoardLoadError | null;
  reload: () => void;
  syncing: boolean;
  syncError: BoardLoadError | null;
  syncBoard: () => void;
  openTaskTab: (task: ParsedTask) => void;
  openTaskTabNewSession: (task: ParsedTask) => void;
  openFeatureTab: (feature: ParsedFeature) => void;
  openFeatureTabNewSession: (feature: ParsedFeature) => void;

  boardMode: BoardMode;
  setBoardMode: (mode: BoardMode) => void;

  // Task Mode search/filter
  taskSearchQuery: string;
  setTaskSearchQuery: (query: string) => void;
  taskActiveFilters: ActiveFilters;
  setTaskActiveFilters: (filters: ActiveFilters) => void;

  // Feature Mode search/filter
  featureSearchQuery: string;
  setFeatureSearchQuery: (query: string) => void;
  featureActiveFilters: FeatureActiveFilters;
  setFeatureActiveFilters: (filters: FeatureActiveFilters) => void;

  // Aliases kept for existing Task Mode consumers
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFilters: ActiveFilters;
  setActiveFilters: (filters: ActiveFilters) => void;

  expandedFeatureIds: Set<string>;
  toggleFeature: (featureId: string) => void;
  selectedTask: SelectedTask;
  setSelectedTask: (task: SelectedTask) => void;
  selectedFeature: ParsedFeature | null;
  setSelectedFeature: (feature: ParsedFeature | null) => void;

  // Backend search results (null = use workspace detail)
  backendTaskResults: ParsedFeature[] | null;
  backendFeatureResults: ParsedFeature[] | null;
  taskSearching: boolean;
  featureSearching: boolean;
  taskSearchError: BoardLoadError | null;
  featureSearchError: BoardLoadError | null;
};

const BoardContext = createContext<BoardContextValue | null>(null);

export type BoardProviderProps = {
  workspaceDetail: WorkspaceDetail;
  children: ReactNode;
};

export function BoardProvider({
  workspaceDetail,
  children,
}: BoardProviderProps) {
  const { features, loading, error, reload } = useBoardData(
    workspaceDetail.id,
    {
      initialData: workspaceDetail,
    },
  );
  const { trackedFeatures, reload: reloadTracking } = usePullRequestTaskData(
    workspaceDetail.id,
  );

  const {
    syncCurrentWorkspace,
    syncingWorkspace: syncing,
    syncError: wsyncError,
  } = useWorkspaceContext();

  const [boardMode, setBoardModeState] = useState<BoardMode>(
    () => getStoredBoardMode() ?? getDefaultBoardMode(),
  );
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [featureSearchQuery, setFeatureSearchQuery] = useState("");
  const [taskActiveFilters, setTaskActiveFiltersState] =
    useState<ActiveFilters>(() => ({
      statuses: getStoredStatusFilter() ?? getDefaultStatusFilter(),
    }));
  const [featureActiveFilters, setFeatureActiveFiltersState] =
    useState<FeatureActiveFilters>(() => ({
      statuses:
        getStoredFeatureStatusFilter() ?? getDefaultFeatureStatusFilter(),
    }));
  const [expandedFeatureIds, setExpandedFeatureIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedTask, setSelectedTask] = useState<SelectedTask>(null);
  const [selectedFeature, setSelectedFeature] = useState<ParsedFeature | null>(
    null,
  );

  // Backend search hooks
  const trimmedTaskQuery = taskSearchQuery.trim();
  const taskSearchActive = boardMode === "task" && trimmedTaskQuery.length > 0;
  const taskSearchParams = taskSearchActive
    ? {
        task_id: trimmedTaskQuery,
        status:
          taskActiveFilters.statuses.length > 0
            ? taskActiveFilters.statuses.join(",")
            : undefined,
      }
    : {};

  const {
    results: backendTaskResults,
    searching: taskSearching,
    searchError: taskSearchError,
  } = useBackendTaskSearch(workspaceDetail.id, taskSearchParams);

  const trimmedFeatureQuery = featureSearchQuery.trim();
  const featureSearchActive =
    boardMode === "feature" && trimmedFeatureQuery.length > 0;
  const featureSearchParams = featureSearchActive
    ? {
        title: trimmedFeatureQuery,
        status:
          featureActiveFilters.statuses.length > 0
            ? featureActiveFilters.statuses.join(",")
            : undefined,
      }
    : {};

  const {
    results: backendFeatureResults,
    searching: featureSearching,
    searchError: featureSearchError,
  } = useBackendFeatureSearch(workspaceDetail.id, featureSearchParams);

  const toggleFeature = useCallback((featureId: string) => {
    setExpandedFeatureIds((prev) => {
      const next = new Set(prev);
      if (next.has(featureId)) {
        next.delete(featureId);
      } else {
        next.add(featureId);
      }
      return next;
    });
  }, []);

  const reloadAll = useCallback(() => {
    reload();
    reloadTracking();
  }, [reload, reloadTracking]);

  const reloadAllRef = useRef(reloadAll);
  useEffect(() => {
    reloadAllRef.current = reloadAll;
  }, [reloadAll]);

  useEffect(() => {
    const id = setInterval(() => {
      reloadAllRef.current();
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const handleSetBoardMode = useCallback((mode: BoardMode) => {
    saveBoardMode(mode);
    setBoardModeState(mode);
  }, []);

  const handleSetTaskActiveFilters = useCallback((filters: ActiveFilters) => {
    saveStatusFilter(filters.statuses);
    setTaskActiveFiltersState(filters);
  }, []);

  const handleSetFeatureActiveFilters = useCallback(
    (filters: FeatureActiveFilters) => {
      saveFeatureStatusFilter(filters.statuses);
      setFeatureActiveFiltersState(filters);
    },
    [],
  );

  const syncBoard = useCallback(() => {
    syncCurrentWorkspace().catch(() => {
      // error captured in syncError
    });
  }, [syncCurrentWorkspace]);

  const { openTaskTab: wsOpenTaskTab, openFeatureTab: wsOpenFeatureTab } =
    useWorkspaceContext();

  const openTaskTab = useCallback(
    (task: ParsedTask) => {
      if (!task.backendId) return;
      wsOpenTaskTab({
        taskId: task.backendId,
        taskName: task.id,
        title: task.title,
        featureId: task.featureBackendId,
      });
    },
    [wsOpenTaskTab],
  );

  const openTaskTabNewSession = useCallback(
    (task: ParsedTask) => {
      if (!task.backendId) return;
      wsOpenTaskTab(
        {
          taskId: task.backendId,
          taskName: task.id,
          title: task.title,
          featureId: task.featureBackendId,
        },
        { forceNewSession: true },
      );
    },
    [wsOpenTaskTab],
  );

  const openFeatureTab = useCallback(
    (feature: ParsedFeature) => {
      if (!feature.backendId) return;
      wsOpenFeatureTab({
        featureId: feature.backendId,
        featureName: feature.id,
        title: feature.title || feature.id,
      });
    },
    [wsOpenFeatureTab],
  );

  const openFeatureTabNewSession = useCallback(
    (feature: ParsedFeature) => {
      if (!feature.backendId) return;
      wsOpenFeatureTab(
        {
          featureId: feature.backendId,
          featureName: feature.id,
          title: feature.title || feature.id,
        },
        { forceNewSession: true },
      );
    },
    [wsOpenFeatureTab],
  );

  // Map workspace sync error to BoardLoadError shape
  const syncError: BoardLoadError | null = wsyncError
    ? {
        kind: "network_error",
        message: wsyncError.message ?? "Sync failed",
        retryable: wsyncError.retryable,
      }
    : null;

  const value = useMemo<BoardContextValue>(
    () => ({
      workspaceDetail,
      features,
      trackedFeatures,
      loading,
      error,
      reload: reloadAll,
      syncing,
      syncError,
      syncBoard,

      boardMode,
      setBoardMode: handleSetBoardMode,

      taskSearchQuery,
      setTaskSearchQuery,
      taskActiveFilters,
      setTaskActiveFilters: handleSetTaskActiveFilters,

      featureSearchQuery,
      setFeatureSearchQuery,
      featureActiveFilters,
      setFeatureActiveFilters: handleSetFeatureActiveFilters,

      // Aliases for existing Task Mode consumers
      searchQuery: taskSearchQuery,
      setSearchQuery: setTaskSearchQuery,
      activeFilters: taskActiveFilters,
      setActiveFilters: handleSetTaskActiveFilters,

      expandedFeatureIds,
      toggleFeature,
      selectedTask,
      setSelectedTask,
      selectedFeature,
      setSelectedFeature,

      backendTaskResults,
      backendFeatureResults,
      taskSearching,
      featureSearching,
      taskSearchError,
      featureSearchError,
      openTaskTab,
      openTaskTabNewSession,
      openFeatureTab,
      openFeatureTabNewSession,
    }),
    [
      workspaceDetail,
      features,
      trackedFeatures,
      loading,
      error,
      reloadAll,
      syncing,
      syncError,
      syncBoard,
      boardMode,
      handleSetBoardMode,
      taskSearchQuery,
      taskActiveFilters,
      handleSetTaskActiveFilters,
      featureSearchQuery,
      featureActiveFilters,
      handleSetFeatureActiveFilters,
      expandedFeatureIds,
      toggleFeature,
      selectedTask,
      selectedFeature,
      backendTaskResults,
      backendFeatureResults,
      taskSearching,
      featureSearching,
      taskSearchError,
      featureSearchError,
      openTaskTab,
      openTaskTabNewSession,
      openFeatureTab,
      openFeatureTabNewSession,
    ],
  );

  return (
    <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
  );
}

export function useBoardContext(): BoardContextValue {
  const ctx = useContext(BoardContext);
  if (!ctx) {
    throw new Error("useBoardContext must be used within a BoardProvider");
  }
  return ctx;
}
