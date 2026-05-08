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
import type { StoredWorkspace } from "@/types/workspace";
import { useBoardData, type UseBoardDataOptions } from "../../hooks/useBoardData";
import { usePullRequestTaskData } from "../../hooks/usePullRequestTaskData";
import type { ActiveFilters, BoardLoadError } from "../../types";
import {
  getDefaultStatusFilter,
  getStoredStatusFilter,
  saveStatusFilter,
} from "../../lib/status-filter-store";

export type SelectedTask = {
  task: ParsedTask;
  featureId: string;
  featureTitle: string;
} | null;

export type BoardContextValue = {
  workspace: StoredWorkspace;
  features: ParsedFeature[];
  trackedFeatures: ParsedFeature[];
  loading: boolean;
  error: BoardLoadError | null;
  reload: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFilters: ActiveFilters;
  setActiveFilters: (filters: ActiveFilters) => void;
  expandedFeatureIds: Set<string>;
  toggleFeature: (featureId: string) => void;
  selectedTask: SelectedTask;
  setSelectedTask: (task: SelectedTask) => void;
};

const BoardContext = createContext<BoardContextValue | null>(null);

export type BoardProviderProps = {
  workspace: StoredWorkspace;
  children: ReactNode;
} & UseBoardDataOptions;

export function BoardProvider({
  workspace,
  children,
  clientFactory,
}: BoardProviderProps) {
  const { features, loading, error, reload } = useBoardData(workspace, {
    clientFactory,
  });
  const {
    trackedFeatures,
    reload: reloadTracking,
  } = usePullRequestTaskData(workspace, {
    clientFactory,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(() => ({
    statuses: getStoredStatusFilter() ?? getDefaultStatusFilter(),
  }));
  const [expandedFeatureIds, setExpandedFeatureIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedTask, setSelectedTask] = useState<SelectedTask>(null);

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

  const handleSetActiveFilters = useCallback((filters: ActiveFilters) => {
    saveStatusFilter(filters.statuses);
    setActiveFilters(filters);
  }, []);

  const value = useMemo<BoardContextValue>(
    () => ({
      workspace,
      features,
      trackedFeatures,
      loading,
      error,
      reload: reloadAll,
      searchQuery,
      setSearchQuery,
      activeFilters,
      setActiveFilters: handleSetActiveFilters,
      expandedFeatureIds,
      toggleFeature,
      selectedTask,
      setSelectedTask,
    }),
    [
      workspace,
      features,
      trackedFeatures,
      loading,
      error,
      reloadAll,
      searchQuery,
      activeFilters,
      handleSetActiveFilters,
      expandedFeatureIds,
      toggleFeature,
      selectedTask,
    ],
  );

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoardContext(): BoardContextValue {
  const ctx = useContext(BoardContext);
  if (!ctx) {
    throw new Error("useBoardContext must be used within a BoardProvider");
  }
  return ctx;
}
