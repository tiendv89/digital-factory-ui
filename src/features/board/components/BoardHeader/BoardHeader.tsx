"use client";

import { useMemo } from "react";
import { useBoardContext } from "../KanbanBoard/KanbanBoard.context";
import { WorkspaceHeader } from "@/features/workspaces/components/WorkspaceHeader";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";

export function BoardHeader() {
  const { workspaceDetail, features } = useBoardContext();
  const { summaries, selectedWorkspaceId } = useWorkspaceContext();

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
    <WorkspaceHeader
      workspaceName={workspaceName}
      featureCount={features.length}
      taskCount={totalTasks}
      sourceState={source_state}
      showMeta={false}
      showTitle={false}
    />
  );
}
