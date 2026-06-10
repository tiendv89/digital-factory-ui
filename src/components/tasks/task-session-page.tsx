"use client";

import { useEffect } from "react";

import { AgentChatPanel } from "@/components/agent-chat";
import { TaskTabView } from "@/components/tasks/task-tab-view";
import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import { useWorkspaceTask } from "@/hooks/tasks/use-workspace-task";

import { ErrorState, LoadingState, type TaskSessionPageProps, useWorkspaceRoute, WorkspaceSessionShell } from "../workspaces/workspace-session-shared";

export function TaskSessionPage({ taskId }: TaskSessionPageProps) {
  const { markTaskTabActive, openTaskTabs } = useWorkspaceContext();

  const workspaceId = openTaskTabs.find((t) => t.taskId === taskId)?.workspaceId ?? "";
  const { activeWorkspace, loadingWorkspace, workspaceError, isReady } = useWorkspaceRoute(workspaceId);
  const { task } = useWorkspaceTask(workspaceId, taskId);

  useEffect(() => {
    if (taskId) markTaskTabActive(taskId);
  }, [markTaskTabActive, taskId]);

  if (!taskId) {
    return <ErrorState message="Missing task ID." />;
  }

  if (workspaceError) {
    return <ErrorState message={workspaceError.message || "Failed to load workspace."} />;
  }

  if (loadingWorkspace || !activeWorkspace || !isReady) {
    return <LoadingState />;
  }

  return (
    <WorkspaceSessionShell workspace={activeWorkspace}>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-hidden">
          <TaskTabView workspaceId={activeWorkspace.id} taskId={taskId} />
        </div>
        <div className="flex w-96 shrink-0 flex-col border-l border-border">{task && <AgentChatPanel workspaceId={activeWorkspace.id} featureId={task.feature_id} />}</div>
      </div>
    </WorkspaceSessionShell>
  );
}
