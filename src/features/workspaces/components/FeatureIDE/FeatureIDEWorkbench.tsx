"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AgentChatPanel } from "@/features/agent-chat";
import { ActivityFeed } from "@/features/board/components/ActivityFeed/ActivityFeed";
import { useFeatureDetail } from "@/features/board/hooks/useFeatureDetail";
import { useActivity } from "@/features/board/hooks/useActivity";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import { workspaceKeys } from "@/lib/query-keys";
import { FeatureIDEExplorer } from "./FeatureIDEExplorer";
import { FeatureIDEDocsPanel } from "./FeatureIDEDocsPanel";
import { FeatureIDEChannelsPane } from "./FeatureIDEChannelsPane";
import type { DocTab } from "./FeatureIDEDocsPanel";

type FeatureIDEWorkbenchProps = {
  workspaceId: string;
  featureId: string;
};

function filterFeatureEvents(
  events: ReturnType<typeof useActivity>["events"],
  featureId: string,
  featureName?: string,
) {
  return events.filter(
    (e) =>
      e.feature_id === featureId ||
      (featureName && e.feature_id === featureName),
  );
}

export function FeatureIDEWorkbench({
  workspaceId,
  featureId,
}: FeatureIDEWorkbenchProps) {
  const { openTaskTab, activeFeatureTabId } = useWorkspaceContext();
  const queryClient = useQueryClient();

  const { feature, loading, error } = useFeatureDetail(workspaceId, featureId);
  const { events: allActivityEvents, loading: activityLoading } = useActivity(workspaceId);

  const [activeDocTab, setActiveDocTab] = useState<DocTab>("product_spec");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  const featureActivityEvents = feature
    ? filterFeatureEvents(allActivityEvents, feature.id, feature.feature_name)
    : [];

  const handleArtifactSaved = useCallback(
    (_artifact: "product_spec" | "technical_design") => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.feature(workspaceId, featureId),
      });
    },
    [queryClient, workspaceId, featureId],
  );

  const handleOpenTaskTab = useCallback(
    (taskId: string, taskName: string, title: string) => {
      if (!feature) return;
      openTaskTab({
        taskId,
        taskName,
        title,
        featureId: feature.id,
        featureName: feature.feature_name,
        parentFeatureTabSessionId: activeFeatureTabId ?? undefined,
      });
    },
    [feature, openTaskTab, activeFeatureTabId],
  );

  const handleSessionSelect = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
    setSelectedChannelId(null);
  }, []);

  const handleNewSession = useCallback(() => {
    setSelectedSessionId(null);
  }, []);

  const handleChannelSelect = useCallback((channelId: string) => {
    setSelectedChannelId(channelId);
    setSelectedSessionId(null);
  }, []);

  if (loading) {
    return (
      <div
        data-feature-ide-loading
        className="flex flex-1 items-center justify-center"
      >
        <p className="text-sm text-text-muted">Loading feature…</p>
      </div>
    );
  }

  if (error || !feature) {
    return (
      <div
        data-feature-ide-error
        className="flex flex-1 items-center justify-center"
      >
        <p className="text-sm text-danger">
          {error?.message ?? "Failed to load feature."}
        </p>
      </div>
    );
  }

  return (
    <div
      data-feature-ide-workbench
      className="flex h-full min-h-0 overflow-hidden"
    >
      {/* Explorer — left pane */}
      <div
        data-feature-ide-explorer-pane
        className="w-56 shrink-0 border-r border-border"
      >
        <FeatureIDEExplorer
          feature={feature}
          workspaceId={workspaceId}
          featureId={featureId}
          activeDocTab={activeDocTab}
          onDocTabChange={setActiveDocTab}
          selectedSessionId={selectedSessionId}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
          selectedChannelId={selectedChannelId}
          onChannelSelect={handleChannelSelect}
        />
      </div>

      {/* Right side: center chat + docs panel + activity dock */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Center + Docs row */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Center — chat pane or channels pane */}
          <div
            data-feature-ide-chat-pane
            className="min-w-0 flex-1 border-r border-border"
          >
            {selectedChannelId ? (
              <FeatureIDEChannelsPane channelId={selectedChannelId} />
            ) : (
              <AgentChatPanel
                workspaceId={workspaceId}
                featureId={featureId}
                onArtifactSaved={handleArtifactSaved}
                requestSessionId={selectedSessionId}
              />
            )}
          </div>

          {/* Right — docs pane */}
          <div
            data-feature-ide-docs-pane
            className="w-80 shrink-0"
          >
            <FeatureIDEDocsPanel
              feature={feature}
              activeTab={activeDocTab}
              onTabChange={setActiveDocTab}
              activityEvents={featureActivityEvents}
              activityLoading={activityLoading}
              onOpenTaskTab={handleOpenTaskTab}
            />
          </div>
        </div>

        {/* Activity dock — bottom */}
        <div
          data-feature-ide-activity-dock
          className="h-48 shrink-0 overflow-y-auto border-t border-border bg-surface"
        >
          <ActivityFeed
            events={featureActivityEvents}
            loading={activityLoading}
            title="Activity"
          />
        </div>
      </div>
    </div>
  );
}
