"use client";

import { AlertCircle } from "lucide-react";
import { use, useEffect } from "react";

import { TaskReviewView } from "@/components/tasks/task-review-view";
import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import { useBoardStore } from "@/stores/board";

type TaskRouteProps = {
  params: Promise<{ taskId: string }>;
};

function LoadingState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <p className="text-sm text-text-muted">Loading workspace…</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
      <AlertCircle className="h-8 w-8 text-danger" />
      <p className="text-sm text-text-secondary">{message}</p>
    </div>
  );
}

export default function TaskRoute({ params }: TaskRouteProps) {
  const { taskId } = use(params);
  const { activeWorkspace, loadingWorkspace, workspaceError } = useWorkspaceContext();
  const setLastViewedTaskId = useBoardStore((s) => s.setLastViewedTaskId);

  useEffect(() => {
    if (taskId) setLastViewedTaskId(taskId);
  }, [taskId, setLastViewedTaskId]);

  if (loadingWorkspace) return <LoadingState />;
  if (workspaceError) return <ErrorState message={workspaceError.message || "Failed to load workspace."} />;
  if (!activeWorkspace) return <LoadingState />;

  const task = activeWorkspace.tasks.find((t) => t.id === taskId) ?? null;

  if (!task) return <ErrorState message={`Task "${taskId}" not found.`} />;

  return (
    <div data-task-page className="flex h-full flex-col overflow-hidden">
      <TaskReviewView task={task} />
    </div>
  );
}
