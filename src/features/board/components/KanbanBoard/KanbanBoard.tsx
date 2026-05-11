"use client";

import { Funnel, RefreshCw, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useBoardContext } from "./KanbanBoard.context";
import { TaskBoardView } from "../TaskBoardView";
import { FeatureBoardView } from "../FeatureBoardView";
import { FEATURE_STATUS_OPTIONS, STATUS_COLUMNS } from "../../lib/status";
import {
  isAllFeatureStatusFilterSelected,
  isAllStatusFilterSelected,
  toggleAllFeatureStatusFilter,
  toggleAllStatusFilter,
  toggleStatusFilter,
} from "../../lib/status-filter";
import type { BoardMode } from "../../lib/status-filter-store";

function ModeSegmentedControl() {
  const { boardMode, setBoardMode } = useBoardContext();

  function handleModeClick(mode: BoardMode) {
    if (mode !== boardMode) {
      setBoardMode(mode);
    }
  }

  return (
    <div
      className="flex h-7 items-center rounded border border-border bg-surface-subtle p-0.5"
      role="tablist"
      aria-label="Board mode"
    >
      <button
        type="button"
        role="tab"
        aria-selected={boardMode === "task"}
        onClick={() => handleModeClick("task")}
        className={
          "h-6 rounded-sm px-2.5 text-xs font-medium transition-colors " +
          (boardMode === "task"
            ? "bg-surface text-text-primary shadow-sm"
            : "text-text-secondary hover:text-text-primary")
        }
      >
        Task
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={boardMode === "feature"}
        onClick={() => handleModeClick("feature")}
        className={
          "h-6 rounded-sm px-2.5 text-xs font-medium transition-colors " +
          (boardMode === "feature"
            ? "bg-surface text-text-primary shadow-sm"
            : "text-text-secondary hover:text-text-primary")
        }
      >
        Feature
      </button>
    </div>
  );
}

function TaskModeFilterMenu({
  onClose,
}: {
  onClose: () => void;
}) {
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
      {STATUS_COLUMNS.map((status) => (
        <label
          key={status.key}
          className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs text-text-secondary hover:bg-surface-subtle"
        >
          <input
            type="checkbox"
            checked={selectedStatuses.has(status.key)}
            onChange={() => toggleStatus(status.key)}
            className="h-3 w-3 accent-primary"
          />
          <span
            className="h-2 w-2 rounded-sm"
            style={{ background: status.color }}
            aria-hidden="true"
          />
          {status.label}
        </label>
      ))}
    </div>
  );
}

function FeatureModeFilterMenu({
  onClose,
}: {
  onClose: () => void;
}) {
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
      {FEATURE_STATUS_OPTIONS.map((status) => (
        <label
          key={status.key}
          className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs text-text-secondary hover:bg-surface-subtle"
        >
          <input
            type="checkbox"
            checked={selectedStatuses.has(status.key)}
            onChange={() => toggleStatus(status.key)}
            className="h-3 w-3 accent-primary"
          />
          <span
            className="h-2 w-2 rounded-sm"
            style={{ background: status.color }}
            aria-hidden="true"
          />
          {status.label}
        </label>
      ))}
    </div>
  );
}

function BoardControls() {
  const {
    loading,
    reload,
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
    <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-4">
      <ModeSegmentedControl />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          aria-label="Sync board"
          className="flex h-8 items-center gap-2 border border-border bg-surface px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={"h-3.5 w-3.5 " + (loading ? "animate-spin" : "")}
            aria-hidden="true"
          />
          {loading ? "Syncing..." : "Sync"}
        </button>
        <label className="flex h-8 w-64 items-center gap-2 border border-border bg-surface px-3 text-xs text-text-secondary focus-within:border-primary">
          <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="sr-only">Search board</span>
          <input
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={
              boardMode === "task"
                ? "Search tasks..."
                : "Search features..."
            }
            className="min-w-0 flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted"
          />
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
              <TaskModeFilterMenu onClose={() => setFilterOpen(false)} />
            ) : (
              <FeatureModeFilterMenu onClose={() => setFilterOpen(false)} />
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
      <BoardControls />
      {boardMode === "task" ? <TaskBoardView /> : <FeatureBoardView />}
    </div>
  );
}
