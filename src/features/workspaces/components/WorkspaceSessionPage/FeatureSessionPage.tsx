"use client";

import { useEffect } from "react";
import { FeatureTabView } from "@/features/board/components/FeatureTabView/FeatureTabView";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import {
  ErrorState,
  LoadingState,
  WorkspaceSessionShell,
  useWorkspaceRoute,
  type FeatureSessionPageProps,
} from "./WorkspaceSessionShared";

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
    <WorkspaceSessionShell workspace={activeWorkspace}>
      <FeatureTabView workspaceId={workspaceId} featureId={featureId} />
    </WorkspaceSessionShell>
  );
}
