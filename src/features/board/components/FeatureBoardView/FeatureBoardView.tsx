"use client";

import { useMemo } from "react";
import { useBoardContext } from "../KanbanBoard/KanbanBoard.context";
import { FeatureListRow } from "./FeatureListRow";
import {
  matchesFeatureModeSearch,
  matchesFeatureModeStatusFilter,
} from "../../lib/filter";
import {
  AccessDeniedState,
  EmptyBoardState,
  NetworkErrorState,
  NoWorkflowDataState,
  ParseErrorState,
} from "../ErrorStates";

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-20">
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
}

export function FeatureBoardView() {
  const {
    features,
    loading,
    error,
    featureSearchQuery,
    featureActiveFilters,
    setSelectedFeature,
  } = useBoardContext();

  const visibleFeatures = useMemo(
    () =>
      features.filter(
        (f) =>
          matchesFeatureModeSearch(f, featureSearchQuery) &&
          matchesFeatureModeStatusFilter(f, featureActiveFilters.statuses),
      ),
    [features, featureSearchQuery, featureActiveFilters],
  );

  let content;
  if (loading) {
    content = (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-muted">Loading features...</p>
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
        <div role="list" aria-label="Features" className="w-full bg-surface">
          {visibleFeatures.map((feature) => (
            <div key={feature.id} role="listitem">
              <FeatureListRow
                feature={feature}
                onClick={() => setSelectedFeature(feature)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {content}
    </div>
  );
}
