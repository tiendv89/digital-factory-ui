"use client";

import { useMemo } from "react";
import { getElapsedSinceStatus } from "@/lib/time";
import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";

export type TaskTrackingItemProps = {
  task: ParsedTask;
  feature: ParsedFeature;
  onSelect: (task: ParsedTask, feature: ParsedFeature) => void;
};

export function TaskTrackingItem({
  task,
  feature,
  onSelect,
}: TaskTrackingItemProps) {
  const elapsed = useMemo(() => getElapsedSinceStatus(task), [task]);

  return (
    <button
      type="button"
      onClick={() => onSelect(task, feature)}
      className="group flex w-full items-start justify-between gap-3 rounded-md border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-surface-subtle focus:outline-none focus-visible:border-primary focus-visible:bg-primary-light/30"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-text-primary">
          <span className="font-mono text-[10px] text-text-muted">
            {task.id}
          </span>{" "}
          {task.title || "Untitled task"}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-text-muted">
          {feature.title || feature.id}
        </p>
      </div>
      <span className="shrink-0 rounded bg-chip-bg px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
        {elapsed}
      </span>
    </button>
  );
}
