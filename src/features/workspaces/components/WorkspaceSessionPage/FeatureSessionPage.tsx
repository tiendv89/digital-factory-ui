"use client";

import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FeatureTabView } from "@/features/board/components/FeatureTabView/FeatureTabView";
import { AgentChatPanel } from "@/features/agent-chat";
import { FeatureStatusPanel } from "@/features/feature-status/FeatureStatusPanel";
import { CollapseToggle } from "@/features/feature-status/CollapseToggle";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
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

  const [leftCollapsed, setLeftCollapsed] = useLocalStorage(
    "df-left-panel-collapsed",
    false,
  );
  const [rightCollapsed, setRightCollapsed] = useLocalStorage(
    "df-right-panel-collapsed",
    false,
  );

  useEffect(() => {
    if (sessionId) markFeatureTabActive(sessionId);
  }, [markFeatureTabActive, sessionId]);

  // Auto-collapse left panel below 1200px
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(max-width: 1199px)");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setLeftCollapsed(true);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [setLeftCollapsed]);

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
        {/* Left panel */}
        <div
          data-left-panel
          className={
            "shrink-0 overflow-hidden border-r border-border transition-[width] duration-200" +
            (leftCollapsed ? " w-0" : " w-64")
          }
        >
          <FeatureStatusPanel workspaceId={workspaceId} featureId={featureId} />
        </div>

        {/* Left collapse toggle */}
        <CollapseToggle
          side="left"
          collapsed={leftCollapsed}
          onToggle={() => setLeftCollapsed((v) => !v)}
        />

        {/* Center */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <FeatureTabView workspaceId={workspaceId} featureId={featureId} />
        </div>

        {/* Right collapse toggle */}
        <CollapseToggle
          side="right"
          collapsed={rightCollapsed}
          onToggle={() => setRightCollapsed((v) => !v)}
        />

        {/* Right panel */}
        <div
          data-right-panel
          className={
            "shrink-0 overflow-hidden border-l border-border transition-[width] duration-200" +
            (rightCollapsed ? " w-0" : " w-96")
          }
        >
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
