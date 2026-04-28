"use client";

import { useMemo } from "react";
import { useWorkspace } from "@/context/workspace-context";
import { KanbanBoard } from "@/components/task-board/kanban-board";
import type { TaskCardData } from "@/components/task-board/task-card";

interface FeatureOption {
  id: string;
  title: string;
}

interface WorkspaceTaskData {
  workspaceId: string;
  tasks: TaskCardData[];
  features: FeatureOption[];
  repos: string[];
}

interface TasksContentProps {
  workspacesData: WorkspaceTaskData[];
}

export function TasksContent({ workspacesData }: TasksContentProps) {
  const { activeWorkspaceId } = useWorkspace();

  const workspaceData = useMemo(
    () => workspacesData.find((w) => w.workspaceId === activeWorkspaceId) ?? null,
    [workspacesData, activeWorkspaceId],
  );

  if (!activeWorkspaceId) {
    return (
      <div className="flex min-h-full items-center justify-center px-8 py-16">
        <div className="text-center">
          <p className="text-sm text-text-secondary">No workspace selected.</p>
          <p className="mt-1 text-xs text-text-muted">
            Return to the dashboard and select a workspace first.
          </p>
        </div>
      </div>
    );
  }

  if (!workspaceData) {
    return (
      <div className="flex min-h-full items-center justify-center px-8 py-16">
        <p className="text-sm text-text-muted">
          Workspace <span className="font-mono">{activeWorkspaceId}</span> not found.
        </p>
      </div>
    );
  }

  const totalTasks = workspaceData.tasks.length;
  const totalFeatures = workspaceData.features.length;

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden py-6">
      {/* Page header */}
      <div className="px-6">
        <h1 className="text-xl font-semibold text-text-primary">Task Board</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          {totalTasks} task{totalTasks !== 1 ? "s" : ""} across {totalFeatures} feature
          {totalFeatures !== 1 ? "s" : ""}
        </p>
      </div>

      <KanbanBoard
        key={workspaceData.workspaceId}
        tasks={workspaceData.tasks}
        features={workspaceData.features}
        repos={workspaceData.repos}
      />
    </div>
  );
}
