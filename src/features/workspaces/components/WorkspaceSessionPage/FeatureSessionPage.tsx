"use client";

import { useEffect } from "react";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import { FeatureIDEWorkbench } from "@/features/workspaces/components/FeatureIDE/FeatureIDEWorkbench";
import {
  ErrorState,
  LoadingState,
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
    <div
      data-feature-session-page
      className="flex h-full flex-col overflow-hidden"
    >
      <FeatureIDEWorkbench workspaceId={workspaceId} featureId={featureId} />
    </div>
  );
}
