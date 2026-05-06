"use client";

import { useMemo } from "react";
import { useBoardContext } from "./KanbanBoard.context";
import { FeatureRow } from "../FeatureRow";
import { filterFeatureTasks } from "../../lib/filter";

export function KanbanBoard() {
  const { features, loading, error, searchQuery, activeFilters } =
    useBoardContext();

  const visibleFeatures = useMemo(() => {
    if (!searchQuery.trim() && activeFilters.statuses.length === 0) {
      return features;
    }
    return features.filter((feature) => {
      const matched = filterFeatureTasks(feature, searchQuery, activeFilters);
      return matched.length > 0;
    });
  }, [features, searchQuery, activeFilters]);

  if (loading && features.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-sm text-text-muted">Loading board…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-sm text-danger">{error.message}</p>
      </div>
    );
  }

  if (features.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-sm text-text-muted">
          No features found in this workspace.
        </p>
      </div>
    );
  }

  if (visibleFeatures.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-sm text-text-muted">
          No features match the current search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-auto px-6 py-4">
      {visibleFeatures.map((feature) => (
        <FeatureRow key={feature.id} feature={feature} />
      ))}
    </div>
  );
}
