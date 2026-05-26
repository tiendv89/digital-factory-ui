"use client";

import { useDeferredValue, useMemo } from "react";
import { useBoardContext } from "../KanbanBoard/KanbanBoard.context";
import { FeatureRow } from "../FeatureRow";
import { PaginationControls } from "../PaginationControls";
import { STATUS_COLUMNS } from "../../lib/status";
import {
  matchesTaskModeSearch,
  matchesTaskModeStatusFilter,
} from "../../lib/filter";
import {
  AccessDeniedState,
  EmptyBoardState,
  NetworkErrorState,
  NoWorkflowDataState,
  ParseErrorState,
} from "../ErrorStates";
import type { ParsedFeature } from "@/services/yaml-parser";

function TaskColumnHeader({
  label,
  color,
  count,
}: {
  label: string;
  color: string;
  count: number;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-between border-r border-border bg-surface-secondary px-3 py-2.5 last:border-r-0">
      <div className="flex min-w-0 items-center gap-2">
        <div
          className="h-2 w-2 rounded-sm"
          style={{ background: color }}
          aria-hidden="true"
        />
        <span className="truncate text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {label}
        </span>
      </div>
      <span
        className="rounded px-1.5 py-0.5 text-xs font-semibold"
        style={{ color, background: `${color}18` }}
      >
        {count}
      </span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-20">
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
}

export function TaskBoardView() {
  const {
    features,
    loading,
    error,
    taskSearchQuery,
    taskActiveFilters,
    expandedFeatureIds,
    toggleFeature,
    setSelectedTask,
    backendTaskResults,
    taskSearching,
    taskSearchError,
    openTaskTab,
    openTaskTabNewSession,
    setTaskPage,
    taskPagination,
  } = useBoardContext();
  const deferredTaskSearchQuery = useDeferredValue(taskSearchQuery);

  // Build a lookup of real feature lifecycle status from the already-loaded
  // features array (which carries backend FeatureSummary.status).  When
  // backend task search results are active, enrich them with this lifecycle
  // status so task-mode feature rows show the real feature status instead of
  // a task-derived proxy.
  const featureStatusMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of features) {
      if (f.id && f.featureStatus) {
        map.set(f.id, f.featureStatus);
      }
    }
    return map;
  }, [features]);

  // Use backend search results when a search is active; otherwise filter client-side
  const visibleFeatures = useMemo<ParsedFeature[]>(() => {
    if (backendTaskResults != null) {
      // Enrich backend results with real feature lifecycle status when available
      return backendTaskResults.map((f) => ({
        ...f,
        featureStatus: featureStatusMap.get(f.id) ?? f.featureStatus,
      }));
    }
    return features.filter(
      (f) =>
        matchesTaskModeSearch(f, deferredTaskSearchQuery) &&
        matchesTaskModeStatusFilter(f, taskActiveFilters.statuses),
    );
  }, [
    features,
    backendTaskResults,
    featureStatusMap,
    deferredTaskSearchQuery,
    taskActiveFilters,
  ]);

  const columnCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const col of STATUS_COLUMNS) counts[col.key] = 0;
    for (const feature of visibleFeatures) {
      for (const task of feature.tasks) {
        if (task.status in counts) counts[task.status]++;
      }
    }
    return counts;
  }, [visibleFeatures]);

  if (loading || taskSearching) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-muted">
          {taskSearching ? "Searching..." : "Loading board..."}
        </p>
      </div>
    );
  }

  const activeError = taskSearchError ?? error;
  if (activeError) {
    if (activeError.kind === "access_denied")
      return <AccessDeniedState message={activeError.message} />;
    if (activeError.kind === "not_found")
      return <NoWorkflowDataState message={activeError.message} />;
    if (activeError.kind === "parse_error")
      return <ParseErrorState message={activeError.message} />;
    return (
      <NetworkErrorState
        message={activeError.message}
        retryable={activeError.retryable}
      />
    );
  }

  if (features.length === 0 && backendTaskResults == null)
    return <EmptyBoardState />;

  if (visibleFeatures.length === 0) {
    return (
      <EmptyState message="No tasks match the current search or filters." />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="w-full">
          <div
            className="sticky top-0 z-10 flex w-full border-b border-border"
            role="row"
            aria-label="Status columns"
          >
            {STATUS_COLUMNS.map((col) => (
              <TaskColumnHeader
                key={col.key}
                label={col.label}
                color={col.color}
                count={columnCounts[col.key] ?? 0}
              />
            ))}
          </div>

          <div role="list" aria-label="Features" className="bg-surface">
            {visibleFeatures.map((feature) => (
              <div key={feature.id} role="listitem">
                <FeatureRow
                  feature={feature}
                  isExpanded={expandedFeatureIds.has(feature.id)}
                  onToggle={() => toggleFeature(feature.id)}
                  onSelectTask={setSelectedTask}
                  onOpenTaskTab={openTaskTab}
                  onOpenTaskTabNewSession={openTaskTabNewSession}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      {taskPagination && (
        <PaginationControls
          pageInfo={taskPagination}
          onPageChange={setTaskPage}
        />
      )}
    </div>
  );
}
