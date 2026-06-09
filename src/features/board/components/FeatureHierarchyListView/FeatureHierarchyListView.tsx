"use client";

import { ChevronRight, Layers3 } from "lucide-react";
import { useMemo, useState, useCallback } from "react";
import { useBoardContext } from "../KanbanBoard/KanbanBoard.context";
import { PaginationControls } from "../PaginationControls";
import {
  AccessDeniedState,
  EmptyBoardState,
  NetworkErrorState,
  NoWorkflowDataState,
  ParseErrorState,
} from "../ErrorStates";
import { getFeatureStatusColor, getStatusColor, STATUS_COLUMNS } from "../../lib/status";
import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";

const STATUS_LABEL_MAP = new Map<string, string>(STATUS_COLUMNS.map((c) => [c.key as string, c.label]));

function StatusBadge({ status }: { status: string }) {
  const color = getStatusColor(status);
  const label = STATUS_LABEL_MAP.get(status) ?? status;
  return (
    <span
      data-status-badge={status}
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium"
      style={{ color, background: `${color}18` }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function FeatureStatusBadge({ status }: { status: string }) {
  const color = getFeatureStatusColor(status);
  const label = status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return (
    <span
      data-feature-status-badge={status}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

type TaskRowProps = {
  task: ParsedTask;
  featureId: string;
  onOpenTaskTab?: (task: ParsedTask) => void;
};

function TaskRow({ task, featureId, onOpenTaskTab }: TaskRowProps) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.key === "Enter" || e.key === " ") && onOpenTaskTab) {
      e.preventDefault();
      onOpenTaskTab(task);
    }
  }

  return (
    <div
      data-list-task-row={task.id}
      role="row"
      tabIndex={onOpenTaskTab ? 0 : undefined}
      aria-label={`Task ${task.id}: ${task.title}`}
      onClick={() => onOpenTaskTab?.(task)}
      onKeyDown={handleKeyDown}
      className={
        "grid border-b border-border last:border-b-0 " +
        (onOpenTaskTab
          ? "cursor-pointer hover:bg-surface-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          : "")
      }
      style={{ gridTemplateColumns: "1fr auto auto" }}
    >
      <div
        className="flex min-w-0 items-center gap-3 py-2 pl-12 pr-3"
        role="cell"
      >
        <span
          className="shrink-0 rounded border border-border bg-surface px-1.5 font-mono text-[10px] font-bold text-text-muted"
          aria-label={`Task ID ${task.id}`}
        >
          {task.id}
        </span>
        <span
          className="min-w-0 truncate text-sm text-text-secondary"
          title={task.title}
        >
          {task.title}
        </span>
      </div>
      <div
        className="flex items-center px-3 py-2"
        role="cell"
        aria-label={`Status: ${task.status}`}
      >
        <StatusBadge status={task.status} />
      </div>
      <div
        className="hidden items-center px-3 py-2 sm:flex"
        role="cell"
        aria-label={`Feature: ${featureId}`}
      >
        {task.branch && (
          <span className="truncate font-mono text-[11px] text-text-muted" title={task.branch}>
            {task.branch}
          </span>
        )}
      </div>
    </div>
  );
}

type FeatureGroupRowProps = {
  feature: ParsedFeature;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenTaskTab?: (task: ParsedTask) => void;
};

function FeatureGroupRow({
  feature,
  isExpanded,
  onToggle,
  onOpenTaskTab,
}: FeatureGroupRowProps) {
  const totalTasks = feature.taskCounts?.total ?? feature.tasks.length;
  const doneTasks =
    feature.taskCounts?.done ??
    feature.tasks.filter((t) => t.status === "done").length;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  }

  return (
    <div
      data-list-feature-row={feature.id}
      role="rowgroup"
      className="border-b border-border last:border-b-0"
    >
      <div
        role="row"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={`list-feature-tasks-${feature.id}`}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        className="flex min-h-10 cursor-pointer items-center gap-3 px-4 py-2 transition-colors hover:bg-surface-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <ChevronRight
          className={
            "h-3.5 w-3.5 shrink-0 text-text-muted transition-transform duration-150 " +
            (isExpanded ? "rotate-90" : "")
          }
          aria-hidden="true"
        />
        <Layers3 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
        <span
          className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary"
          title={feature.title || feature.id}
        >
          {feature.title || feature.id}
        </span>
        {feature.title && feature.title !== feature.id && (
          <span className="hidden shrink-0 font-mono text-[11px] text-text-muted sm:inline">
            {feature.id}
          </span>
        )}
        <div className="flex shrink-0 items-center gap-2">
          <FeatureStatusBadge status={feature.featureStatus} />
          <span className="text-xs text-text-muted">
            {doneTasks}/{totalTasks}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div
          id={`list-feature-tasks-${feature.id}`}
          role="rowgroup"
          className="bg-surface-secondary"
        >
          {feature.tasks.length === 0 ? (
            <div className="py-3 pl-12 text-xs text-text-muted">No tasks</div>
          ) : (
            feature.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                featureId={feature.id}
                onOpenTaskTab={onOpenTaskTab}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function FeatureHierarchyListView() {
  const {
    features,
    loading,
    error,
    backendFeatureResults,
    backendTaskResults,
    featureSearching,
    taskSearching,
    featureSearchError,
    taskSearchError,
    boardMode,
    openTaskTab,
    openFeatureTab,
    setFeaturePage,
    setTaskPage,
    featurePagination,
    taskPagination,
    setFeatureLimit,
    setTaskLimit,
  } = useBoardContext();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleFeature = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const visibleFeatures = useMemo(() => {
    if (boardMode === "task") {
      return backendTaskResults ?? features;
    }
    return backendFeatureResults ?? features;
  }, [boardMode, features, backendFeatureResults, backendTaskResults]);

  const isSearching = boardMode === "task" ? taskSearching : featureSearching;
  const activeError =
    boardMode === "task"
      ? (taskSearchError ?? error)
      : (featureSearchError ?? error);
  const pagination =
    boardMode === "task" ? taskPagination : featurePagination;
  const onPageChange = boardMode === "task" ? setTaskPage : setFeaturePage;
  const onLimitChange = boardMode === "task" ? setTaskLimit : setFeatureLimit;

  if (loading || isSearching) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-muted">
          {isSearching ? "Searching..." : "Loading features..."}
        </p>
      </div>
    );
  }

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

  if (features.length === 0 && backendFeatureResults == null && backendTaskResults == null) {
    return <EmptyBoardState />;
  }

  if (visibleFeatures.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-20">
        <p className="text-sm text-text-muted">
          No features match the current search or filters.
        </p>
      </div>
    );
  }

  return (
    <div
      data-feature-hierarchy-list
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          role="table"
          aria-label="Features and tasks list"
          className="w-full"
        >
          <div
            role="row"
            className="sticky top-0 z-10 grid border-b border-border bg-surface-secondary px-4 py-2"
            style={{ gridTemplateColumns: "1fr auto auto" }}
          >
            <span
              role="columnheader"
              className="text-xs font-semibold text-text-muted"
            >
              Feature / Task
            </span>
            <span
              role="columnheader"
              className="px-3 text-xs font-semibold text-text-muted"
            >
              Status
            </span>
            <span
              role="columnheader"
              className="hidden px-3 text-xs font-semibold text-text-muted sm:block"
            >
              Branch
            </span>
          </div>
          <div role="rowgroup">
            {visibleFeatures.map((feature) => (
              <FeatureGroupRow
                key={feature.id}
                feature={feature}
                isExpanded={expandedIds.has(feature.id)}
                onToggle={() => toggleFeature(feature.id)}
                onOpenTaskTab={openTaskTab}
              />
            ))}
          </div>
        </div>
      </div>
      {pagination && (
        <PaginationControls
          pageInfo={pagination}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
        />
      )}
    </div>
  );
}
