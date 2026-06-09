"use client";

import { useMemo, useState } from "react";
import { useBoardContext } from "../KanbanBoard/KanbanBoard.context";
import { NewFeatureModal } from "../NewFeatureModal/NewFeatureModal";
import { WorkspaceHeader } from "@/features/workspaces/components/WorkspaceHeader/WorkspaceHeader";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";

export function BoardHeader() {
  const { workspaceDetail, features, reload } = useBoardContext();
  const { summaries, selectedWorkspaceId, refreshWorkspace, refreshingWorkspace } =
    useWorkspaceContext();

  const [showNewFeature, setShowNewFeature] = useState(false);

  const totalTasks = useMemo(
    () => features.reduce((sum, feature) => sum + feature.tasks.length, 0),
    [features],
  );

  const { source_state } = workspaceDetail;
  const selectedSummary = summaries.find(
    (summary) => summary.workspaceId === selectedWorkspaceId,
  );
  const workspaceName =
    selectedSummary?.name || workspaceDetail.name || workspaceDetail.slug;

  return (
    <>
      <WorkspaceHeader
        workspaceName={workspaceName}
        featureCount={features.length}
        taskCount={totalTasks}
        sourceState={source_state}
        showMeta={false}
        showTitle={false}
        onRefresh={refreshWorkspace}
        refreshing={refreshingWorkspace}
        onNewFeature={() => setShowNewFeature(true)}
      />
      {showNewFeature && (
        <NewFeatureModal
          workspaceId={workspaceDetail.id}
          onClose={() => setShowNewFeature(false)}
          onSuccess={() => {
            setShowNewFeature(false);
            reload();
          }}
        />
      )}
    </>
  );
}
