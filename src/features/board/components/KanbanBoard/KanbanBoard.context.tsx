"use client";

import {
  createContext,
  useCallback,
  useContext,
  useDeferredValue,
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
import { useWorkspaceActionsContext } from "@/features/workspaces/context/WorkspaceContext";
import type {
  ActiveFilters,
  BoardLoadError,
  FeatureActiveFilters,
  PaginationMeta,
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
import {
  isAllStatusFilterSelected,
  isAllFeatureStatusFilterSelected,
} from "../../lib/status-filter";
import {
  BOARD_DEFAULT_LIMIT,
  BOARD_DEFAULT_SORT,
} from "../../lib/backend-list-params";

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

  // Backend search results (null = use workspace detail)
  backendTaskResults: ParsedFeature[] | null;
  backendFeatureResults: ParsedFeature[] | null;
  taskSearching: boolean;
  featureSearching: boolean;
  taskSearchError: BoardLoadError | null;
  featureSearchError: BoardLoadError | null;

  // Pagination state per mode
  taskPage: number;
  setTaskPage: (page: number) => void;
  featurePage: number;
  setFeaturePage: (page: number) => void;
  taskPagination: PaginationMeta | null;
  featurePagination: PaginationMeta | null;

  // Sort state per mode
  taskSort: string;
  setTaskSort: (sort: string) => void;
  featureSort: string;
  setFeatureSort: (sort: string) => void;

  // Page size (limit) state per mode
  taskLimit: number;
  setTaskLimit: (limit: number) => void;
  featureLimit: number;
  setFeatureLimit: (limit: number) => void;
};

const BoardContext = createContext<BoardContextValue | null>(null);
export type BoardTrackingContextValue = Pick<
  BoardContextValue,
  "trackedFeatures" | "openTaskTab" | "openTaskTabNewSession"
>;

const BoardTrackingContext = createContext<BoardTrackingContextValue | null>(
  null,
);

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
    openTaskTab: wsOpenTaskTab,
    openFeatureTab: wsOpenFeatureTab,
  } = useWorkspaceActionsContext();

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
  const [taskPage, setTaskPage] = useState(1);
  const [featurePage, setFeaturePage] = useState(1);
  const [taskSort, setTaskSort] = useState(BOARD_DEFAULT_SORT);
  const [featureSort, setFeatureSort] = useState(BOARD_DEFAULT_SORT);
  const [taskLimit, setTaskLimit] = useState(BOARD_DEFAULT_LIMIT);
  const [featureLimit, setFeatureLimit] = useState(BOARD_DEFAULT_LIMIT);

  // Build a map of feature backend ID -> feature lifecycle status from the
  // already-loaded features array.  Passed to useBackendTaskSearch so
  // adaptTaskSummariesToFeatures can set the correct feature lifecycle status
  // on each ParsedFeature instead of falling back to a task-derived value.
  const featureStatusMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of features) {
      if (f.backendId && f.featureStatus) {
        map.set(f.backendId, f.featureStatus);
      }
    }
    return map as ReadonlyMap<string, string>;
  }, [features]);

  // Backend search hooks
  const deferredTaskSearchQuery = useDeferredValue(taskSearchQuery);
  const deferredFeatureSearchQuery = useDeferredValue(featureSearchQuery);
  const trimmedTaskQuery = deferredTaskSearchQuery.trim();

  // Backend search is active when either search text is present OR the status
  // filter is a non-default subset (not all statuses selected).  When every
  // status is selected there is no effective filter, so we fall back to the
  // workspace root payload.
  const taskStatusFilterActive =
    taskActiveFilters.statuses.length > 0 &&
    !isAllStatusFilterSelected(taskActiveFilters.statuses);
  const taskSearchActive =
    boardMode === "task" &&
    (trimmedTaskQuery.length > 0 || taskStatusFilterActive);

  // Reset page to 1 when search query, filters, sort, or limit change
  const prevTaskQueryRef = useRef(trimmedTaskQuery);
  const prevTaskStatusRef = useRef(
    taskActiveFilters.statuses.join(","),
  );
  const prevTaskSortRef = useRef(taskSort);
  const prevTaskLimitRef = useRef(taskLimit);
  useEffect(() => {
    const currentStatus = taskActiveFilters.statuses.join(",");
    if (
      trimmedTaskQuery !== prevTaskQueryRef.current ||
      currentStatus !== prevTaskStatusRef.current ||
      taskSort !== prevTaskSortRef.current ||
      taskLimit !== prevTaskLimitRef.current
    ) {
      setTaskPage(1);
    }
    prevTaskQueryRef.current = trimmedTaskQuery;
    prevTaskStatusRef.current = currentStatus;
    prevTaskSortRef.current = taskSort;
    prevTaskLimitRef.current = taskLimit;
  }, [trimmedTaskQuery, taskActiveFilters.statuses, taskSort, taskLimit]);

  const taskSearchParams = useMemo(() => {
    if (!taskSearchActive) return {};

    const status = taskStatusFilterActive
      ? taskActiveFilters.statuses.join(",")
      : undefined;

    return {
      title: trimmedTaskQuery || undefined,
      status,
      page: taskPage,
      limit: taskLimit,
      sort: taskSort,
    };
  }, [trimmedTaskQuery, taskActiveFilters.statuses, taskPage, taskSearchActive, taskStatusFilterActive, taskSort, taskLimit]);

  const {
    results: backendTaskResults,
    searching: taskSearching,
    searchError: taskSearchError,
    pagination: taskPagination,
  } = useBackendTaskSearch(workspaceDetail.id, taskSearchParams, featureStatusMap);

  const trimmedFeatureQuery = deferredFeatureSearchQuery.trim();

  // Feature-mode backend search activates when search text is present OR the
  // status filter is a non-default subset.  All-feature-statuses-selected
  // means no effective filter — fall back to the workspace root payload.
  const featureStatusFilterActive =
    featureActiveFilters.statuses.length > 0 &&
    !isAllFeatureStatusFilterSelected(featureActiveFilters.statuses);
  const featureSearchActive =
    boardMode === "feature" &&
    (trimmedFeatureQuery.length > 0 || featureStatusFilterActive);

  const prevFeatureQueryRef = useRef(trimmedFeatureQuery);
  const prevFeatureStatusRef = useRef(
    featureActiveFilters.statuses.join(","),
  );
  const prevFeatureSortRef = useRef(featureSort);
  const prevFeatureLimitRef = useRef(featureLimit);
  useEffect(() => {
    const currentStatus = featureActiveFilters.statuses.join(",");
    if (
      trimmedFeatureQuery !== prevFeatureQueryRef.current ||
      currentStatus !== prevFeatureStatusRef.current ||
      featureSort !== prevFeatureSortRef.current ||
      featureLimit !== prevFeatureLimitRef.current
    ) {
      setFeaturePage(1);
    }
    prevFeatureQueryRef.current = trimmedFeatureQuery;
    prevFeatureStatusRef.current = currentStatus;
    prevFeatureSortRef.current = featureSort;
    prevFeatureLimitRef.current = featureLimit;
  }, [trimmedFeatureQuery, featureActiveFilters.statuses, featureSort, featureLimit]);

  const featureSearchParams = useMemo(() => {
    if (!featureSearchActive) return {};

    const status = featureStatusFilterActive
      ? featureActiveFilters.statuses.join(",")
      : undefined;

    return {
      title: trimmedFeatureQuery || undefined,
      status,
      page: featurePage,
      limit: featureLimit,
      sort: featureSort,
    };
  }, [trimmedFeatureQuery, featureActiveFilters.statuses, featurePage, featureSearchActive, featureStatusFilterActive, featureSort, featureLimit]);

  const {
    results: backendFeatureResults,
    searching: featureSearching,
    searchError: featureSearchError,
    pagination: featurePagination,
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
  const syncError = useMemo<BoardLoadError | null>(
    () =>
      wsyncError
        ? {
            kind: "network_error",
            message: wsyncError.message ?? "Sync failed",
            retryable: wsyncError.retryable,
          }
        : null,
    [wsyncError],
  );

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

      taskPage,
      setTaskPage,
      featurePage,
      setFeaturePage,
      taskPagination,
      featurePagination,

      taskSort,
      setTaskSort,
      featureSort,
      setFeatureSort,
      taskLimit,
      setTaskLimit,
      featureLimit,
      setFeatureLimit,
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

      taskPage,
      featurePage,
      taskPagination,
      featurePagination,

      taskSort,
      featureSort,
      taskLimit,
      featureLimit,
    ],
  );

  const trackingValue = useMemo<BoardTrackingContextValue>(
    () => ({
      trackedFeatures,
      openTaskTab,
      openTaskTabNewSession,
    }),
    [trackedFeatures, openTaskTab, openTaskTabNewSession],
  );

  return (
    <BoardContext.Provider value={value}>
      <BoardTrackingContext.Provider value={trackingValue}>
        {children}
      </BoardTrackingContext.Provider>
    </BoardContext.Provider>
  );
}

export function useBoardContext(): BoardContextValue {
  const ctx = useContext(BoardContext);
  if (!ctx) {
    throw new Error("useBoardContext must be used within a BoardProvider");
  }
  return ctx;
}

export function useBoardTrackingContext(): BoardTrackingContextValue {
  const ctx = useContext(BoardTrackingContext);
  if (!ctx) {
    throw new Error(
      "useBoardTrackingContext must be used within a BoardProvider",
    );
  }
  return ctx;
}
