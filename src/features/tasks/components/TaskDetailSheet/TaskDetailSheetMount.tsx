"use client";

import { useBoardContext } from "@/features/board/components/KanbanBoard";
import { getNextActionLabel } from "../../lib/status";
import { TaskDetailSheet } from "./TaskDetailSheet";

export function TaskDetailSheetMount() {
  const { selectedTask, setSelectedTask, workspace } = useBoardContext();
  const repository = `${workspace.owner}/${workspace.repo}`;
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
