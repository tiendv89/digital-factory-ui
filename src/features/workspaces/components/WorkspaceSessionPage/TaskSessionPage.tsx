"use client";

import { useEffect } from "react";
import { TaskTabView } from "@/features/tasks/components/TaskTabView/TaskTabView";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import {
  ErrorState,
  LoadingState,
  WorkspaceSessionShell,
  useWorkspaceRoute,
  type TaskSessionPageProps,
} from "./WorkspaceSessionShared";

export function TaskSessionPage({
  sessionId,
  workspaceId,
  taskId,
}: TaskSessionPageProps) {
  const { markTaskTabActive } = useWorkspaceContext();
  const { activeWorkspace, loadingWorkspace, workspaceError, isReady } =
    useWorkspaceRoute(workspaceId);

  useEffect(() => {
    if (sessionId) markTaskTabActive(sessionId);
  }, [markTaskTabActive, sessionId]);

  if (!workspaceId || !taskId) {
    return <ErrorState message="Missing task route parameters." />;
  }

  if (workspaceError) {
    return (
      <ErrorState
        message={workspaceError.message || "Failed to load workspace."}
      />
    );
  }

  if (loadingWorkspace || !activeWorkspace || !isReady) {
    return <LoadingState />;
  }

  return (
    <WorkspaceSessionShell workspace={activeWorkspace}>
      <TaskTabView workspaceId={workspaceId} taskId={taskId} />
    </WorkspaceSessionShell>
  );
}
