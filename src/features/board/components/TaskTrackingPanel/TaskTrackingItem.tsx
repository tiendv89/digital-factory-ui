"use client";

import { getNextAction } from "@/features/board/lib/status";
import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";

export type TaskTrackingItemProps = {
  task: ParsedTask;
  feature: ParsedFeature;
  onSelect: (task: ParsedTask, feature: ParsedFeature) => void;
};

const ACTOR_TYPE_LABEL: Record<string, string> = {
  agent: "Agent",
  human: "Human",
  either: "Agent or Human",
};

export function TaskTrackingItem({
  task,
  feature,
  onSelect,
}: TaskTrackingItemProps) {
  const actorLabel = task.execution?.actor_type
    ? ACTOR_TYPE_LABEL[task.execution.actor_type] ?? task.execution.actor_type
    : null;

  const nextInfo = task.blockedReason
    ? task.blockedReason
    : getNextAction(task.status);

  return (
    <button
      type="button"
      onClick={() => onSelect(task, feature)}
      className="group flex w-full flex-col gap-1 rounded-md border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-surface-subtle focus:outline-none focus-visible:border-primary focus-visible:bg-primary-light/30"
    >
      <p className="truncate text-xs font-medium text-text-primary">
        <span className="font-mono text-[10px] text-text-muted">{task.id}</span>{" "}
        {task.title || "Untitled task"}
      </p>
      <p className="truncate text-[11px] text-text-muted">
        {feature.title || feature.id}
      </p>
      {(actorLabel || nextInfo) && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-text-muted">
          {actorLabel && (
            <span className="rounded bg-chip-bg px-1.5 py-0.5 font-mono">
              {actorLabel}
            </span>
          )}
          {nextInfo && (
            <span className="truncate italic">{nextInfo}</span>
          )}
        </div>
      )}
    </button>
  );
}
