"use client";

import { useCallback, useMemo } from "react";
import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";
import { useBoardContext } from "../KanbanBoard/KanbanBoard.context";
import { groupTrackedTasks } from "./groupTasks";
import { TaskTrackingSection } from "./TaskTrackingSection";

export function TaskTrackingPanel() {
  const { features, setSelectedTask } = useBoardContext();

  const sections = useMemo(() => groupTrackedTasks(features), [features]);

  const handleSelect = useCallback(
    (task: ParsedTask, feature: ParsedFeature) => {
      setSelectedTask({
        task,
        featureId: feature.id,
        featureTitle: feature.title || feature.id,
      });
    },
    [setSelectedTask],
  );

  return (
    <aside
      className="flex w-72 shrink-0 flex-col border-r border-border bg-surface"
      aria-label="Task tracking panel"
    >
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">
          Task Tracking
        </h2>
        <p className="mt-0.5 text-xs text-text-muted">
          Active work across all features
        </p>
      </header>
      <div className="flex-1 overflow-y-auto">
        {sections.map((section) => (
          <TaskTrackingSection
            key={section.status}
            section={section}
            onSelectTask={handleSelect}
          />
        ))}
      </div>
    </aside>
  );
}
