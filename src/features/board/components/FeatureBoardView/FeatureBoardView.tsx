"use client";

import { useMemo } from "react";
import { useBoardContext } from "../KanbanBoard/KanbanBoard.context";
import { FeatureListRow } from "./FeatureListRow";
import { PaginationControls } from "../PaginationControls";
import type { ParsedFeature } from "@/services/yaml-parser";
import {
  FEATURE_STATUS_OPTIONS,
  isValidFeatureStatus,
} from "../../lib/status";
import {
  AccessDeniedState,
  EmptyBoardState,
  NetworkErrorState,
  NoWorkflowDataState,
  ParseErrorState,
} from "../ErrorStates";

const MIN_FEATURE_COLUMN_WIDTH = 180;

type FeatureStatusColumn = {
  key: string;
  label: string;
  color: string;
};

function getFeatureStatusColumns(): FeatureStatusColumn[] {
  return [...FEATURE_STATUS_OPTIONS];
}

function FeatureColumnHeader({
  statusKey,
  label,
  color,
  count,
}: {
  statusKey: string;
  label: string;
  color: string;
  count: number;
}) {
  return (
    <div
      data-feature-status-header={statusKey}
      className="flex min-w-0 items-center justify-between border-r border-border bg-surface-secondary px-3 py-2.5 last:border-r-0"
      style={{ minWidth: MIN_FEATURE_COLUMN_WIDTH }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-sm"
          style={{ background: color }}
          aria-hidden="true"
        />
        <span className="truncate text-xs font-semibold tracking-wide text-text-secondary">
          {label.toUpperCase()}
        </span>
      </div>
      <span
        data-feature-status-count={statusKey}
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

export function FeatureBoardView() {
  const {
    features,
    loading,
    error,
    openFeatureTab,
    openFeatureTabNewSession,
    backendFeatureResults,
    featureSearching,
    featureSearchError,
    setFeaturePage,
    featurePagination,
    setFeatureLimit,
  } = useBoardContext();

  // Use backend search results when a search or filter is active; otherwise
  // show all features from the workspace root payload without local filtering.
  // Only features with valid lifecycle statuses are shown in Feature/Kanban mode —
  // task-derived statuses (todo, ready, in_progress, in_review) are never columns.
  const visibleFeatures = useMemo(() => {
    const source = backendFeatureResults != null ? backendFeatureResults : features;
    return source.filter((f) => isValidFeatureStatus(f.featureStatus));
  }, [features, backendFeatureResults]);

  const featureStatusColumns = useMemo(() => getFeatureStatusColumns(), []);

  const featureStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const column of featureStatusColumns) {
      counts[column.key] = 0;
    }

    for (const feature of visibleFeatures) {
      counts[feature.featureStatus] ??= 0;
      counts[feature.featureStatus] += 1;
    }

    return counts;
  }, [featureStatusColumns, visibleFeatures]);

  const activeError = featureSearchError ?? error;

  let content;
  if (loading || featureSearching) {
    content = (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-muted">
          {featureSearching ? "Searching..." : "Loading features..."}
        </p>
      </div>
    );
  } else if (activeError) {
    if (activeError.kind === "access_denied") {
      content = <AccessDeniedState message={activeError.message} />;
    } else if (activeError.kind === "not_found") {
      content = <NoWorkflowDataState message={activeError.message} />;
    } else if (activeError.kind === "parse_error") {
      content = <ParseErrorState message={activeError.message} />;
    } else {
      content = (
        <NetworkErrorState
          message={activeError.message}
          retryable={activeError.retryable}
        />
      );
    }
  } else if (features.length === 0 && backendFeatureResults == null) {
    content = <EmptyBoardState />;
  } else if (visibleFeatures.length === 0) {
    content = (
      <EmptyState message="No features match the current search or filters." />
    );
  } else {
    const gridTemplateColumns = `repeat(${featureStatusColumns.length}, minmax(${MIN_FEATURE_COLUMN_WIDTH}px, 1fr))`;

    content = (
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div
          data-feature-kanban-board
          className="min-h-full w-full"
          style={{
            minWidth: MIN_FEATURE_COLUMN_WIDTH * featureStatusColumns.length,
          }}
        >
          <div
            className="sticky top-0 z-10 grid w-full border-b border-border"
            role="row"
            aria-label="Feature status columns"
            style={{ gridTemplateColumns }}
          >
            {featureStatusColumns.map((column) => (
              <FeatureColumnHeader
                key={column.key}
                statusKey={column.key}
                label={column.label}
                color={column.color}
                count={featureStatusCounts[column.key] ?? 0}
              />
            ))}
          </div>

          <div role="list" aria-label="Features" className="bg-surface">
            {visibleFeatures.map((feature) => (
              <div
                key={feature.id}
                data-feature-grid-row
                role="listitem"
                className="grid min-h-26 border-b border-border"
                style={{ gridTemplateColumns }}
              >
                {featureStatusColumns.map((column) => (
                  <div
                    key={`${feature.id}-${column.key}`}
                    data-feature-status-cell
                    className="min-w-0 border-r border-border p-2 last:border-r-0"
                    role="cell"
                    aria-label={`${column.label} cell for ${feature.id}`}
                  >
                    {column.key === feature.featureStatus && (
                      <FeatureListRow
                        feature={feature}
                        onClick={() => openFeatureTab(feature)}
                        onOpenNewTab={() => openFeatureTabNewSession(feature)}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {content}
      {featurePagination && (
        <PaginationControls
          pageInfo={featurePagination}
          onPageChange={setFeaturePage}
          onLimitChange={setFeatureLimit}
        />
      )}
    </div>
  );
}
