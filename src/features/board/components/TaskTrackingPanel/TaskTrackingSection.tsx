"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { TaskTrackingItem } from "./TaskTrackingItem";
import type { TrackedSection, TrackedStatus } from "./TaskTrackingPanel.types";
import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";

const STATUS_DOT_CLASS: Record<TrackedStatus, string> = {
  in_progress: "bg-warning",
  ready: "bg-ready",
  in_review: "bg-purple",
};

export type TaskTrackingSectionProps = {
  section: TrackedSection;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectTask: (task: ParsedTask, feature: ParsedFeature) => void;
};

export function TaskTrackingSection({
  section,
  isExpanded,
  onToggle,
  onSelectTask,
}: TaskTrackingSectionProps) {
  const { label, status, items } = section;
  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

  return (
    <section
      className="border-b border-border last:border-b-0"
      aria-label={label}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between px-3 pb-2 pt-3 text-left transition-colors hover:bg-surface focus:outline-none focus-visible:bg-primary-light/30"
      >
        <div className="flex items-center gap-2">
          <ChevronIcon
            className="h-3 w-3 shrink-0 text-text-muted"
            aria-hidden="true"
          />
          <span
            className={"h-1.5 w-1.5 shrink-0 rounded-full " + STATUS_DOT_CLASS[status]}
            aria-hidden="true"
          />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            {label}
          </span>
        </div>
        <span className="font-mono text-[10px] text-text-muted">
          {items.length}
        </span>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-1 px-2 pb-3">
          {items.length === 0 ? (
            <p className="px-3 py-2 text-[11px] italic text-text-muted">
              No tasks.
            </p>
          ) : (
            items.map(({ task, feature }) => (
              <TaskTrackingItem
                key={`${feature.id}/${task.id}`}
                task={task}
                feature={feature}
                onSelect={onSelectTask}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}
