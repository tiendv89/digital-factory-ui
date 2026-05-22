"use client";

import { useBoardContext } from "@/features/board/components/KanbanBoard";
import { useFeatureTask } from "@/features/board/hooks/useFeatureDetail";
import { adaptTaskDetail } from "@/features/workspaces/lib/workspaceAdapter";
import { getNextActionLabel } from "../../lib/status";
import { TaskDetailSheet } from "./TaskDetailSheet";

function repoDisplayName(repoUrl: string): string {
  try {
    const url = new URL(repoUrl);
    return url.pathname.replace(/^\//, "").replace(/\.git$/, "");
  } catch {
    return repoUrl;
  }
}

export function TaskDetailSheetMount() {
  const { selectedTask, setSelectedTask, workspaceDetail } = useBoardContext();
  const repository = repoDisplayName(workspaceDetail.repo_url);
  const featureId =
    selectedTask?.task.featureBackendId ?? selectedTask?.featureId ?? null;
  const taskId = selectedTask?.task.backendId ?? selectedTask?.task.id ?? null;
  const { task: backendTask } = useFeatureTask(
    workspaceDetail.id,
    featureId,
    taskId,
  );
  const task = backendTask
    ? adaptTaskDetail(backendTask)
    : selectedTask?.task ?? null;
  const featureTitle = backendTask?.feature_name ?? selectedTask?.featureTitle;
  const nextAction =
    backendTask?.next_action ||
    (selectedTask ? getNextActionLabel(selectedTask.task.status) : undefined);

  return (
    <TaskDetailSheet
      task={task}
      featureTitle={featureTitle}
      repository={repository}
      nextAction={nextAction}
      onClose={() => setSelectedTask(null)}
    />
  );
}
