"use client";

import { useMemo } from "react";
import { useBoardContext } from "./KanbanBoard.context";
import { FeatureRow } from "../FeatureRow";
import { STATUS_COLUMNS } from "../../lib/status";
import { matchesSearch, matchesStatusFilter } from "../../lib/filter";

const MIN_COLUMN_WIDTH = 140;

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
      className="flex min-w-0 flex-1 items-center justify-between border-r border-border bg-bg px-3 py-2.5 last:border-r-0"
      style={{ minWidth: MIN_COLUMN_WIDTH }}
    >
      <div className="flex items-center gap-2">
        <div
          className="h-2 w-2 rounded-sm"
          style={{ background: color }}
          aria-hidden="true"
        />
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
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

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-muted">Loading board…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-danger">{error.message}</p>
      </div>
    );
  }

  if (features.length === 0) {
    return <EmptyState message="No features found in this workspace." />;
  }

  if (visibleFeatures.length === 0) {
    return (
      <EmptyState message="No features match the current search or filters." />
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Scrollable board area */}
      <div className="flex-1 overflow-auto">
        <div className="w-full" style={{ minWidth: MIN_COLUMN_WIDTH * STATUS_COLUMNS.length }}>
          {/* Sticky column header row */}
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

          {/* Feature rows */}
          <div role="list" aria-label="Features">
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
    </div>
  );
}
