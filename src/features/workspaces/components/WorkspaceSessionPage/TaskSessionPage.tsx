"use client";

import { useEffect } from "react";
import { TaskTabView } from "@/features/tasks/components/TaskTabView/TaskTabView";
import { AgentChatPanel } from "@/features/agent-chat";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import { useWorkspaceTask } from "@/features/tasks/hooks/useWorkspaceTask";
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
  const { task } = useWorkspaceTask(workspaceId, taskId);

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
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-hidden">
          <TaskTabView workspaceId={workspaceId} taskId={taskId} />
        </div>
        <div className="flex w-96 shrink-0 flex-col border-l border-border">
          {task && (
            <AgentChatPanel
              workspaceId={workspaceId}
              featureId={task.feature_id}
            />
          )}
        </div>
      </div>
    </WorkspaceSessionShell>
  );
}
