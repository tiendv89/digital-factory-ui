"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { FeatureTabView } from "@/features/board/components/FeatureTabView";
import { TaskTabView } from "@/features/tasks";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import { WorkspaceHeader } from "@/features/workspaces/components/WorkspaceHeader";

type TaskSessionPageProps = {
  sessionId: string;
  workspaceId: string;
  taskId: string;
};

type FeatureSessionPageProps = {
  sessionId: string;
  workspaceId: string;
  featureId: string;
};

function LoadingState() {
  return (
    <main className="flex h-screen flex-col bg-bg">
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-muted">Loading workspace…</p>
      </div>
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="flex h-screen flex-col bg-bg">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="h-8 w-8 text-danger" aria-hidden="true" />
        <p className="text-sm text-text-secondary">{message}</p>
      </div>
    </main>
  );
}

function useWorkspaceRoute(workspaceId: string) {
  const {
    activeWorkspace,
    loadingWorkspace,
    workspaceError,
    selectedWorkspaceId,
    selectWorkspace,
  } = useWorkspaceContext();

  useEffect(() => {
    if (!workspaceId || selectedWorkspaceId === workspaceId) return;
    selectWorkspace(workspaceId);
  }, [selectWorkspace, selectedWorkspaceId, workspaceId]);

  return {
    activeWorkspace,
    loadingWorkspace,
    workspaceError,
    isReady: activeWorkspace?.id === workspaceId,
  };
}

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
    <main className="flex h-screen flex-col bg-bg">
      <WorkspaceHeader
        workspaceName={activeWorkspace.name || activeWorkspace.slug}
        featureCount={activeWorkspace.features.length}
        taskCount={activeWorkspace.tasks.length}
        sourceState={activeWorkspace.source_state}
        showTitle={false}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TaskTabView workspaceId={workspaceId} taskId={taskId} />
      </div>
    </main>
  );
}

export function FeatureSessionPage({
  sessionId,
  workspaceId,
  featureId,
}: FeatureSessionPageProps) {
  const { markFeatureTabActive } = useWorkspaceContext();
  const { activeWorkspace, loadingWorkspace, workspaceError, isReady } =
    useWorkspaceRoute(workspaceId);

  useEffect(() => {
    if (sessionId) markFeatureTabActive(sessionId);
  }, [markFeatureTabActive, sessionId]);

  if (!workspaceId || !featureId) {
    return <ErrorState message="Missing feature route parameters." />;
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
    <main className="flex h-screen flex-col bg-bg">
      <WorkspaceHeader
        workspaceName={activeWorkspace.name || activeWorkspace.slug}
        featureCount={activeWorkspace.features.length}
        taskCount={activeWorkspace.tasks.length}
        sourceState={activeWorkspace.source_state}
        showTitle={false}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <FeatureTabView workspaceId={workspaceId} featureId={featureId} />
      </div>
    </main>
  );
}
