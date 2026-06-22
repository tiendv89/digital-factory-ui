"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { FeatureWorkbench } from "@/components/features/feature-workbench";
import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import { useLocalWorkspaceStore } from "@/stores/workspace";

import { ErrorState, type FeatureSessionPageProps, LoadingState, useWorkspaceRoute } from "../workspaces/workspace-session-shared";

export function FeatureSessionPage({ featureId }: FeatureSessionPageProps) {
  const router = useRouter();
  const { markFeatureTabActive, openFeatureTabs, activeWorkspace: ctxWorkspace } = useWorkspaceContext();
  const setLastVisitedFeatureId = useLocalWorkspaceStore((s) => s.setLastVisitedFeatureId);

  const workspaceId = openFeatureTabs.find((t) => t.featureId === featureId)?.workspaceId ?? ctxWorkspace?.id ?? "";
  const { activeWorkspace, loadingWorkspace, workspaceError, isReady } = useWorkspaceRoute(workspaceId);

  useEffect(() => {
    if (featureId) {
      markFeatureTabActive(featureId);
      setLastVisitedFeatureId(featureId);
    }
  }, [markFeatureTabActive, setLastVisitedFeatureId, featureId]);

  // If the workspace is loaded but doesn't contain this feature, the user
  // switched workspaces while on this URL — redirect to the board.
  useEffect(() => {
    if (!isReady || !activeWorkspace || loadingWorkspace) return;
    const exists = activeWorkspace.features.some((f) => f.feature_id === featureId);
    if (!exists) {
      setLastVisitedFeatureId(null);
      router.replace("/board");
    }
  }, [isReady, activeWorkspace, loadingWorkspace, featureId, router, setLastVisitedFeatureId]);

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
