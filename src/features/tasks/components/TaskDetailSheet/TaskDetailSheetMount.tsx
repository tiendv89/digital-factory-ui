"use client";

import { useBoardContext } from "@/features/board/components/KanbanBoard";
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
  const nextAction = selectedTask
    ? getNextActionLabel(selectedTask.task.status)
    : undefined;

  return (
    <TaskDetailSheet
      task={selectedTask?.task ?? null}
      featureTitle={selectedTask?.featureTitle}
      repository={repository}
      nextAction={nextAction}
      onClose={() => setSelectedTask(null)}
    />
  );
}
