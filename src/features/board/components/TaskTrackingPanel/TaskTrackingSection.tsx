"use client";

import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { TaskTrackingItem } from "./TaskTrackingItem";
import type { TrackedSection, TrackedStatus } from "./TaskTrackingPanel.types";
import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";

const STATUS_ICON_STYLE: Record<
  TrackedStatus,
  { icon: LucideIcon; boxClass: string; iconClass: string }
> = {
  in_progress: {
    icon: Zap,
    boxClass: "bg-warning-bg",
    iconClass: "text-warning",
  },
  in_review: {
    icon: Clock3,
    boxClass: "bg-purple-bg",
    iconClass: "text-purple",
  },
  ready: {
    icon: Check,
    boxClass: "bg-primary-light",
    iconClass: "text-primary",
  },
};

export type TaskTrackingSectionProps = {
  section: TrackedSection;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectTask: (task: ParsedTask, feature: ParsedFeature) => void;
  onOpenTaskTab?: (task: ParsedTask) => void;
  onOpenTaskTabNewSession?: (task: ParsedTask) => void;
};

export function TaskTrackingSection({
  section,
  isExpanded,
  onToggle,
  onSelectTask,
  onOpenTaskTab,
  onOpenTaskTabNewSession,
}: TaskTrackingSectionProps) {
  const { label, status, items } = section;
  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;
  const StatusIcon = STATUS_ICON_STYLE[status].icon;

  return (
    <section
      className="border-b border-border last:border-b-0"
      aria-label={label}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex h-12 w-full items-center justify-between px-4 text-left transition-colors hover:bg-surface focus:outline-none focus-visible:bg-primary-light/30"
      >
        <div className="flex items-center gap-2">
          <ChevronIcon
            className="h-3 w-3 shrink-0 text-text-muted"
            aria-hidden="true"
          />
          <span
            className={
              "flex h-5 w-5 shrink-0 items-center justify-center " +
              STATUS_ICON_STYLE[status].boxClass
            }
            aria-hidden="true"
          >
            <StatusIcon
              className={"h-3 w-3 " + STATUS_ICON_STYLE[status].iconClass}
            />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            {label}
          </span>
        </div>
        <span
          aria-label={`${label} task count`}
          className="min-w-8 border border-border bg-surface px-2 text-center font-mono text-sm font-bold leading-6 text-text-primary shadow-sm"
        >
          {items.length}
        </span>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-2 px-4 pb-3">
          {items.length === 0 ? (
            <p className="flex min-h-[68px] items-center justify-center border border-dashed border-border text-[11px] text-text-muted">
              No tasks.
            </p>
          ) : (
            items.map(({ task, feature }) => (
              <TaskTrackingItem
                key={`${feature.id}/${task.id}`}
                task={task}
                feature={feature}
                onSelect={onSelectTask}
                onOpenTab={onOpenTaskTab}
                onOpenNewTab={onOpenTaskTabNewSession}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}
