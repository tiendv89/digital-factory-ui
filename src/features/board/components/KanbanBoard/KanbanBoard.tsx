"use client";

import { Funnel, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useBoardContext } from "./KanbanBoard.context";
import { FeatureRow } from "../FeatureRow";
import { STATUS_COLUMNS } from "../../lib/status";
import { matchesSearch, matchesStatusFilter } from "../../lib/filter";
import {
  isAllStatusFilterSelected,
  toggleAllStatusFilter,
  toggleStatusFilter,
} from "../../lib/status-filter";
import {
  AccessDeniedState,
  EmptyBoardState,
  NetworkErrorState,
  NoWorkflowDataState,
  ParseErrorState,
} from "../ErrorStates";

const MIN_COLUMN_WIDTH = 180;

function ColumnHeader({
  label,
  color,
  count,
}: {
  label: string;
  color: string;
  count: number;
}) {
  return (
    <div
      className="flex min-w-0 flex-1 items-center justify-between border-r border-border bg-surface-secondary px-3 py-2.5 last:border-r-0"
      style={{ minWidth: MIN_COLUMN_WIDTH }}
    >
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

function BoardControls() {
  const {
    loading,
    reload,
    searchQuery,
    setSearchQuery,
    activeFilters,
    setActiveFilters,
  } = useBoardContext();
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const selectedStatuses = new Set(activeFilters.statuses);
  const allSelected = isAllStatusFilterSelected(activeFilters.statuses);

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

  function toggleStatus(status: string) {
    setActiveFilters({ statuses: toggleStatusFilter(activeFilters.statuses, status) });
  }

  function toggleAllStatuses() {
    setActiveFilters({
      statuses: toggleAllStatusFilter(activeFilters.statuses),
    });
  }

  return (
    <div className="flex h-12 shrink-0 items-center justify-end gap-2 border-b border-border bg-surface px-4">
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
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
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
        </button>
        {filterOpen && (
          <div
            role="menu"
            className="absolute right-0 top-9 z-30 w-48 border border-border bg-surface p-2 shadow-lg"
          >
            <label className="mb-1 flex cursor-pointer items-center gap-2 border-b border-border px-2 py-1.5 pb-2 text-xs font-semibold text-text-primary hover:bg-surface-subtle">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAllStatuses}
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
        )}
      </div>
    </div>
  );
}

export function KanbanBoard() {
  const {
    features,
    loading,
    error,
    searchQuery,
    activeFilters,
    expandedFeatureIds,
    toggleFeature,
    setSelectedTask,
  } = useBoardContext();

  const visibleFeatures = useMemo(
    () =>
      features.filter(
        (f) =>
          matchesSearch(f, searchQuery) &&
          matchesStatusFilter(f, activeFilters.statuses),
      ),
    [features, searchQuery, activeFilters],
  );

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

  let content;
  if (loading) {
    content = (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-muted">Loading board...</p>
      </div>
    );
  } else if (error) {
    if (error.kind === "access_denied") {
      content = <AccessDeniedState message={error.message} />;
    } else if (error.kind === "not_found") {
      content = <NoWorkflowDataState message={error.message} />;
    } else if (error.kind === "parse_error") {
      content = <ParseErrorState message={error.message} />;
    } else {
      content = <NetworkErrorState message={error.message} />;
    }
  } else if (features.length === 0) {
    content = <EmptyBoardState />;
  } else if (visibleFeatures.length === 0) {
    content = (
      <EmptyState message="No features match the current search or filters." />
    );
  } else {
    content = (
      <div className="min-h-0 flex-1 overflow-auto">
        <div
          className="w-full"
          style={{ minWidth: MIN_COLUMN_WIDTH * STATUS_COLUMNS.length }}
        >
          <div
            className="sticky top-0 z-10 flex w-full border-b border-border"
            role="row"
            aria-label="Status columns"
          >
            {STATUS_COLUMNS.map((col) => (
              <ColumnHeader
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
                  minColumnWidth={MIN_COLUMN_WIDTH}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border border-border bg-surface">
      <BoardControls />
      {content}
    </div>
  );
}
