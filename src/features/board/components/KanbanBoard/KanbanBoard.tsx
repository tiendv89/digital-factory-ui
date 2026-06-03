"use client";

import {
  AlertTriangle,
  Funnel,
  LayoutGrid,
  ListChecks,
  Search,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useBoardContext } from "./KanbanBoard.context";
import { TaskBoardView } from "../TaskBoardView";
import { FeatureBoardView } from "../FeatureBoardView";
import { BoardTableTitle } from "../BoardTableTitle";

import {
  FEATURE_MODE_STATUSES,
  TASK_MODE_STATUSES,
  clientFeatureStatusLabel,
  clientStatusLabel,
  getFeatureStatusColor,
  getStatusColor,
} from "../../lib/status";
import {
  isAllFeatureStatusFilterSelected,
  isAllStatusFilterSelected,
  toggleAllFeatureStatusFilter,
  toggleAllStatusFilter,
  toggleStatusFilter,
} from "../../lib/status-filter";
import type { BoardMode } from "../../lib/status-filter-store";

function StaleBanner() {
  const { workspaceDetail, syncError } = useBoardContext();
  const { source_state } = workspaceDetail;

  if (syncError) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex items-center gap-3 border-b border-danger bg-danger-bg px-4 py-2"
      >
        <AlertTriangle
          className="h-4 w-4 shrink-0 text-danger"
          aria-hidden="true"
        />
        <p className="flex-1 text-xs text-danger">
          <span className="font-semibold">Data unavailable</span>
          {` — ${syncError.message}`}
        </p>
      </div>
    );
  }

  if (!source_state?.stale) return null;

  const staleMessage = source_state.error_code
    ? `Data is out of date (Error: ${source_state.error_code}).`
    : "Data may be out of date.";

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2"
    >
      <AlertTriangle
        className="h-4 w-4 shrink-0 text-warning"
        aria-hidden="true"
      />
      <p className="flex-1 text-xs text-warning">{staleMessage}</p>
    </div>
  );
}

function ModeSegmentedControl() {
  const { boardMode, setBoardMode } = useBoardContext();

  function handleModeClick(mode: BoardMode) {
    if (mode !== boardMode) {
      setBoardMode(mode);
    }
  }

  return (
    <div
      className="inline-flex items-stretch rounded-md border border-border bg-surface p-0.5 shadow-sm"
      role="tablist"
      aria-label="Board mode"
    >
      <button
        type="button"
        role="tab"
        aria-selected={boardMode === "task"}
        onClick={() => handleModeClick("task")}
        className={
          "flex h-7 items-center gap-1.5 rounded-sm px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface " +
          (boardMode === "task"
            ? "border border-success bg-success text-white shadow-sm"
            : "border border-transparent text-text-secondary hover:bg-surface-subtle hover:text-text-primary")
        }
      >
        <ListChecks className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Task
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={boardMode === "feature"}
        onClick={() => handleModeClick("feature")}
        className={
          "flex h-7 items-center gap-1.5 rounded-sm px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface " +
          (boardMode === "feature"
            ? "border border-success bg-success text-white shadow-sm"
            : "border border-transparent text-text-secondary hover:bg-surface-subtle hover:text-text-primary")
        }
      >
        <LayoutGrid className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Feature
      </button>
    </div>
  );
}

function TaskModeFilterMenu() {
  const { taskActiveFilters, setTaskActiveFilters } = useBoardContext();
  const selectedStatuses = new Set(taskActiveFilters.statuses);
  const allSelected = isAllStatusFilterSelected(taskActiveFilters.statuses);

  function toggleStatus(status: string) {
    setTaskActiveFilters({
      statuses: toggleStatusFilter(taskActiveFilters.statuses, status),
    });
  }

  function toggleAll() {
    setTaskActiveFilters({
      statuses: toggleAllStatusFilter(taskActiveFilters.statuses),
    });
  }

  return (
    <div
      role="menu"
      className="absolute right-0 top-9 z-30 w-48 border border-border bg-surface p-2 shadow-lg"
    >
      <label className="mb-1 flex cursor-pointer items-center gap-2 border-b border-border px-2 py-1.5 pb-2 text-xs font-semibold text-text-primary hover:bg-surface-subtle">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="h-3 w-3 accent-primary"
        />
        All
      </label>
      {TASK_MODE_STATUSES.map((statusKey) => (
        <label
          key={statusKey}
          className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs text-text-secondary hover:bg-surface-subtle"
        >
          <input
            type="checkbox"
            checked={selectedStatuses.has(statusKey)}
            onChange={() => toggleStatus(statusKey)}
            className="h-3 w-3 accent-primary"
          />
          <span
            className="h-2 w-2 rounded-sm"
            style={{ background: getStatusColor(statusKey) }}
            aria-hidden="true"
          />
          <span>{clientStatusLabel(statusKey)}</span>
        </label>
      ))}
    </div>
  );
}

function FeatureModeFilterMenu() {
  const { featureActiveFilters, setFeatureActiveFilters } = useBoardContext();
  const selectedStatuses = new Set(featureActiveFilters.statuses);
  const allSelected = isAllFeatureStatusFilterSelected(
    featureActiveFilters.statuses,
  );

  function toggleStatus(status: string) {
    setFeatureActiveFilters({
      statuses: toggleStatusFilter(
        featureActiveFilters.statuses,
        status,
      ) as typeof featureActiveFilters.statuses,
    });
  }

  function toggleAll() {
    setFeatureActiveFilters({
      statuses: toggleAllFeatureStatusFilter(featureActiveFilters.statuses),
    });
  }

  return (
    <div
      role="menu"
      className="absolute right-0 top-9 z-30 w-48 border border-border bg-surface p-2 shadow-lg"
    >
      <label className="mb-1 flex cursor-pointer items-center gap-2 border-b border-border px-2 py-1.5 pb-2 text-xs font-semibold text-text-primary hover:bg-surface-subtle">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="h-3 w-3 accent-primary"
        />
        All
      </label>
      {FEATURE_MODE_STATUSES.map((statusKey) => (
        <label
          key={statusKey}
          className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs text-text-secondary hover:bg-surface-subtle"
        >
          <input
            type="checkbox"
            checked={selectedStatuses.has(statusKey)}
            onChange={() => toggleStatus(statusKey)}
            className="h-3 w-3 accent-primary"
          />
          <span
            className="h-2 w-2 rounded-sm"
            style={{ background: getFeatureStatusColor(statusKey) }}
            aria-hidden="true"
          />
          {clientFeatureStatusLabel(statusKey)}
        </label>
      ))}
    </div>
  );
}

function BoardControls() {
  const {
    boardMode,
    taskSearchQuery,
    setTaskSearchQuery,
    featureSearchQuery,
    setFeatureSearchQuery,
    taskActiveFilters,
    featureActiveFilters,
  } = useBoardContext();
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const activeFilterCount =
    boardMode === "task"
      ? taskActiveFilters.statuses.length
      : featureActiveFilters.statuses.length;

  const searchValue =
    boardMode === "task" ? taskSearchQuery : featureSearchQuery;
  const setSearchValue =
    boardMode === "task" ? setTaskSearchQuery : setFeatureSearchQuery;

  useEffect(() => {
    if (!filterOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!filterRef.current?.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [filterOpen]);

  return (
    <div
      data-board-controls
      className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-4"
    >
      <ModeSegmentedControl />

      <div className="flex items-center gap-2">
        <label className="flex h-8 w-64 items-center gap-2 border border-border bg-surface px-3 text-xs text-text-secondary focus-within:border-primary">
          <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="sr-only">Search board</span>
          <input
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={
              boardMode === "task" ? "Search tasks..." : "Search features..."
            }
            className="min-w-0 flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => setSearchValue("")}
              aria-label="Clear search"
              className="shrink-0 text-text-muted hover:text-text-primary"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </label>
        <div ref={filterRef} className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen((open) => !open)}
            aria-expanded={filterOpen}
            aria-haspopup="menu"
            className="flex h-8 items-center gap-2 border border-border bg-surface px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-subtle"
          >
            <Funnel className="h-3.5 w-3.5" aria-hidden="true" />
            Filter
            {activeFilterCount > 0 && (
              <span className="rounded bg-primary/10 px-1 text-xs font-semibold text-primary">
                {activeFilterCount}
              </span>
            )}
          </button>
          {filterOpen &&
            (boardMode === "task" ? (
              <TaskModeFilterMenu />
            ) : (
              <FeatureModeFilterMenu />
            ))}
        </div>
      </div>
    </div>
  );
}

export function KanbanBoard() {
  const { boardMode } = useBoardContext();

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border border-border bg-surface">
      <StaleBanner />
      <BoardTableTitle />
      <BoardControls />
      {boardMode === "task" ? <TaskBoardView /> : <FeatureBoardView />}
    </div>
  );
}
