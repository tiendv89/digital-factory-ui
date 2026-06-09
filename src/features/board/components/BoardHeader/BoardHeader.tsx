"use client";

import { useMemo, useState } from "react";
import { useBoardContext } from "../KanbanBoard/KanbanBoard.context";
import { WorkspaceHeader } from "@/features/workspaces/components/WorkspaceHeader/WorkspaceHeader";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import { ImportModal } from "@/features/workspaces/components/ImportModal/ImportModal";

export function BoardHeader() {
  const { workspaceDetail, features } = useBoardContext();
  const { summaries, selectedWorkspaceId, refreshWorkspace, refreshingWorkspace } =
    useWorkspaceContext();

  const [showImport, setShowImport] = useState(false);

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
        onNewFeature={() => setShowImport(true)}
      />
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => setShowImport(false)}
        />
      )}
    </>
  );
}
