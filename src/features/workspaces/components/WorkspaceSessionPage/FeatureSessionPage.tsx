"use client";

import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FeatureTabView } from "@/features/board/components/FeatureTabView/FeatureTabView";
import { AgentChatPanel } from "@/features/agent-chat";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import { workspaceKeys } from "@/lib/query-keys";
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
  const queryClient = useQueryClient();

  useEffect(() => {
    if (sessionId) markFeatureTabActive(sessionId);
  }, [markFeatureTabActive, sessionId]);

  const handleArtifactSaved = useCallback(
    (_artifact: "product_spec" | "technical_design") => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.feature(workspaceId, featureId),
      });
    },
    [queryClient, workspaceId, featureId],
  );

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
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-hidden">
          <FeatureTabView workspaceId={workspaceId} featureId={featureId} />
        </div>
        <div className="flex w-96 shrink-0 flex-col border-l border-border">
          <AgentChatPanel
            workspaceId={workspaceId}
            featureId={featureId}
            onArtifactSaved={handleArtifactSaved}
          />
        </div>
      </div>
    </WorkspaceSessionShell>
  );
}
