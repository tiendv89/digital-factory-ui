"use client";

import { useEffect } from "react";

import { FeatureWorkbench } from "@/components/features/feature-workbench";
import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import { useLocalWorkspaceStore } from "@/stores/workspace";

import { ErrorState, type FeatureSessionPageProps, LoadingState, useWorkspaceRoute } from "../workspaces/workspace-session-shared";

export function FeatureSessionPage({ featureId }: FeatureSessionPageProps) {
  const { markFeatureTabActive, openFeatureTabs, activeWorkspace: ctxWorkspace } = useWorkspaceContext();
  const setLastVisitedFeatureId = useLocalWorkspaceStore((s) => s.setLastVisitedFeatureId);

  // Prefer a workspace from an open tab; fall back to the already-selected workspace so
  // direct navigation (e.g. first-time load from the nav icon) doesn't get stuck loading.
  const workspaceId = openFeatureTabs.find((t) => t.featureId === featureId)?.workspaceId ?? ctxWorkspace?.id ?? "";
  const { activeWorkspace, loadingWorkspace, workspaceError, isReady } = useWorkspaceRoute(workspaceId);

  useEffect(() => {
    if (featureId) {
      markFeatureTabActive(featureId);
      setLastVisitedFeatureId(featureId);
    }
  }, [markFeatureTabActive, setLastVisitedFeatureId, featureId]);

  if (!featureId) {
    return <ErrorState message="Missing feature ID." />;
  }

  if (workspaceError) {
    return <ErrorState message={workspaceError.message || "Failed to load workspace."} />;
  }

  if (loadingWorkspace || !activeWorkspace || !isReady) {
    return <LoadingState />;
  }

  return (
    <div data-feature-session-page className="flex h-full flex-col overflow-hidden">
      <FeatureWorkbench workspaceId={activeWorkspace.id} featureId={featureId} />
    </div>
  );
}
