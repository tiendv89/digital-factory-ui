"use client";

import { Check, Clock3, Layers3, Zap } from "lucide-react";
import { useMemo } from "react";
import { useBoardContext } from "../KanbanBoard/KanbanBoard.context";
import { groupTrackedTasks } from "./groupTasks";
import type { PanelSelection, TrackedStatus } from "./TaskTrackingPanel.types";

const PANEL_ORDER: TrackedStatus[] = ["in_review", "in_progress", "ready"];

const STATUS_ICON = {
  in_review: Clock3,
  in_progress: Zap,
  ready: Check,
} satisfies Record<TrackedStatus, typeof Clock3>;

const STATUS_STYLE = {
  in_review: "bg-purple-bg text-purple",
  in_progress: "bg-warning-bg text-warning",
  ready: "bg-primary-light text-primary",
} satisfies Record<TrackedStatus, string>;

type TaskTrackingPanelProps = {
  selectedPanel: PanelSelection;
  onSelectPanel: (panel: PanelSelection) => void;
};

export function TaskTrackingPanel({
  selectedPanel,
  onSelectPanel,
}: TaskTrackingPanelProps) {
  const { trackedFeatures } = useBoardContext();

  const sections = useMemo(
    () => groupTrackedTasks(trackedFeatures),
    [trackedFeatures],
  );
  const orderedSections = useMemo(
    () =>
      PANEL_ORDER.map((status) => sections.find((section) => section.status === status))
        .filter((section): section is (typeof sections)[number] => Boolean(section)),
    [sections],
  );
  const isBoardSelected = selectedPanel === "kanban_board";

  return (
    <aside
      className="flex w-72 shrink-0 flex-col border-r border-border bg-surface-secondary"
      aria-label="Task tracking panel"
    >
      <button
        type="button"
        onClick={() => onSelectPanel("kanban_board")}
        className={
          "flex h-10 w-full items-center gap-2 border-b border-border border-l-2 px-4 text-left transition-colors hover:bg-surface " +
          (isBoardSelected
            ? "border-l-success "
            : "border-l-transparent bg-surface-secondary")
        }
        aria-pressed={isBoardSelected}
      >
        <Layers3 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
          Kanban Board
        </h2>
      </button>
      <div className="flex-1 overflow-y-auto">
        {orderedSections.map((section) => {
          const Icon = STATUS_ICON[section.status];
          const isActive = selectedPanel === section.status;

          return (
            <button
              key={section.status}
              type="button"
              onClick={() => onSelectPanel(section.status)}
              className={
                "flex h-11 w-full items-center justify-between border-b border-l-2 border-border px-4 text-left transition-colors hover:bg-surface " +
                (isActive
                  ? "border-l-primary bg-surface"
                  : "border-l-transparent bg-surface-secondary")
              }
              aria-pressed={isActive}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={
                    "flex h-5 w-5 shrink-0 items-center justify-center " +
                    STATUS_STYLE[section.status]
                  }
                >
                  <Icon className="h-3 w-3" aria-hidden="true" />
                </span>
                <span className="truncate text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                  {section.label}
                </span>
              </span>
              <span className="rounded bg-muted-bg px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                {section.items.length}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
