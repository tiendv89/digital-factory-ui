"use client";

import { LayoutList } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useBoardContext } from "../KanbanBoard/KanbanBoard.context";
import { groupTrackedTasks } from "./groupTasks";
import type { TrackedStatus } from "./TaskTrackingPanel.types";
import { TaskTrackingSection } from "./TaskTrackingSection";
import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";

const ALL_EXPANDED: Record<TrackedStatus, boolean> = {
  in_progress: true,
  in_review: true,
  ready: true,
};

export function TaskTrackingPanel() {
  const { features, setSelectedTask, searchQuery, activeFilters } =
    useBoardContext();

  const sections = useMemo(
    () => groupTrackedTasks(features, searchQuery, activeFilters),
    [features, searchQuery, activeFilters],
  );

  const [expanded, setExpanded] =
    useState<Record<TrackedStatus, boolean>>(ALL_EXPANDED);

  const toggleSection = useCallback((status: TrackedStatus) => {
    setExpanded((prev) => ({ ...prev, [status]: !prev[status] }));
  }, []);

  const handleSelectTask = useCallback(
    (task: ParsedTask, feature: ParsedFeature) => {
      setSelectedTask({
        task,
        featureId: feature.id,
        featureTitle: feature.title,
      });
    },
    [setSelectedTask],
  );

  return (
    <aside
      className="flex shrink-0 flex-col overflow-hidden border-r border-border bg-surface-secondary"
      style={{ width: "15%", minWidth: "11rem", maxWidth: "20rem" }}
      aria-label="Tasks sidebar"
    >
      <header className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <LayoutList
            className="h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            Tasks Sidebar
          </h2>
        </div>
        <p className="mt-1 text-[10px] leading-tight text-text-muted">
          Expand each status to view tasks directly in the sidebar.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto">
        {sections.map((section) => (
          <TaskTrackingSection
            key={section.status}
            section={section}
            isExpanded={expanded[section.status]}
            onToggle={() => toggleSection(section.status)}
            onSelectTask={handleSelectTask}
          />
        ))}
      </div>
    </aside>
  );
}
