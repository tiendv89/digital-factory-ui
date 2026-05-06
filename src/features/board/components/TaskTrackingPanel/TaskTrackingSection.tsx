"use client";

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
  onSelectTask: (task: ParsedTask, feature: ParsedFeature) => void;
};

export function TaskTrackingSection({
  section,
  onSelectTask,
}: TaskTrackingSectionProps) {
  const { label, status, items } = section;

  return (
    <section
      className="border-b border-border last:border-b-0"
      aria-label={label}
    >
      <header className="flex items-center justify-between px-4 pb-2 pt-3">
        <div className="flex items-center gap-2">
          <span
            className={
              "h-1.5 w-1.5 rounded-full " + STATUS_DOT_CLASS[status]
            }
            aria-hidden="true"
          />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            {label}
          </h3>
        </div>
        <span className="font-mono text-[10px] text-text-muted">
          {items.length}
        </span>
      </header>
      <div className="flex flex-col gap-1 px-2 pb-3">
        {items.length === 0 ? (
          <p className="px-3 py-2 text-[11px] italic text-text-muted">
            No tasks
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
    </section>
  );
}
