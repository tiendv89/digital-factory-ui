"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";
import { useBoardContext } from "../KanbanBoard/KanbanBoard.context";
import {
  bucketTasksByStatus,
  buildTaskSegments,
  computeProgress,
  filterFeatureTasks,
} from "../../lib/filter";
import { STATUS_KEYS, STATUS_LABEL } from "../../lib/status";
import { TaskCard } from "../TaskCard";
import { SegmentBar } from "./SegmentBar";

export type FeatureRowProps = {
  feature: ParsedFeature;
};

const FEATURE_STATUS_TONE: Record<string, string> = {
  in_design: "bg-muted-bg text-text-secondary",
  in_tdd: "bg-warning-bg text-warning",
  ready_for_implementation: "bg-ready-bg text-ready",
  in_implementation: "bg-primary-light text-primary",
  in_handoff: "bg-warning-bg text-warning",
  done: "bg-success-bg text-success",
  blocked: "bg-danger-bg text-danger",
  cancelled: "bg-muted-bg text-text-muted",
};

function featurePillTone(featureStatus: string): string {
  return FEATURE_STATUS_TONE[featureStatus] ?? "bg-muted-bg text-text-secondary";
}

export function FeatureRow({ feature }: FeatureRowProps) {
  const {
    expandedFeatureIds,
    toggleFeature,
    searchQuery,
    activeFilters,
    setSelectedTask,
  } = useBoardContext();

  const isExpanded = expandedFeatureIds.has(feature.id);

  const visibleTasks = filterFeatureTasks(feature, searchQuery, activeFilters);
  const segments = buildTaskSegments(visibleTasks);
  const progress = computeProgress(visibleTasks);
  const buckets = bucketTasksByStatus(visibleTasks);

  const onSelect = (task: ParsedTask) => {
    setSelectedTask({
      task,
      featureId: feature.id,
      featureTitle: feature.title,
    });
  };

  const Caret = isExpanded ? ChevronDown : ChevronRight;

  return (
    <section
      data-testid={`feature-row-${feature.id}`}
      className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm"
    >
      <button
        type="button"
        onClick={() => toggleFeature(feature.id)}
        aria-expanded={isExpanded}
        aria-controls={`feature-grid-${feature.id}`}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Caret
          className="h-4 w-4 flex-shrink-0 text-text-muted"
          aria-hidden="true"
        />
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-text-primary">
                {feature.title || feature.id}
              </h3>
              <span className="font-mono text-[11px] text-text-muted">
                {feature.id}
              </span>
            </div>
          </div>
          <span
            className={`hidden flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:inline-block ${featurePillTone(
              feature.featureStatus,
            )}`}
          >
            {feature.featureStatus.replace(/_/g, " ")}
          </span>
          <span className="hidden flex-shrink-0 text-xs text-text-muted md:inline">
            {progress.done}/{progress.total} done
          </span>
        </div>
      </button>

      <div className="border-t border-border bg-surface-secondary px-4 py-2">
        <SegmentBar segments={segments} total={visibleTasks.length} />
      </div>

      {isExpanded && (
        <div
          id={`feature-grid-${feature.id}`}
          className="grid gap-2 border-t border-border bg-bg p-3"
          style={{
            gridTemplateColumns: `repeat(${STATUS_KEYS.length}, minmax(180px, 1fr))`,
          }}
        >
          {STATUS_KEYS.map((status) => (
            <div key={status} className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                <span>{STATUS_LABEL[status]}</span>
                <span>{buckets[status].length}</span>
              </div>
              {buckets[status].length === 0 ? (
                <div className="rounded-md border border-dashed border-border px-2 py-3 text-center text-[11px] text-text-muted">
                  Empty
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {buckets[status].map((task) => (
                    <TaskCard key={task.id} task={task} onSelect={onSelect} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
