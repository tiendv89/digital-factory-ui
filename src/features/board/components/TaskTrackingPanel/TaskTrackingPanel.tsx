"use client";

import { Layers } from "lucide-react";
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
  const { trackedFeatures, setSelectedTask } = useBoardContext();

  const sections = useMemo(
    () => groupTrackedTasks(trackedFeatures),
    [trackedFeatures],
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
      style={{ width: "20.25rem", maxWidth: "100vw" }}
      aria-label="Tasks sidebar"
    >
      <header className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Layers
            className="h-4 w-4 shrink-0 text-success"
            aria-hidden="true"
          />
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-primary">
            Tasks Sidebar
          </h2>
        </div>
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
