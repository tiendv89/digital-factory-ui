"use client";

import { useBoardContext } from "@/features/board/components/KanbanBoard";
import { TaskDetailSheet } from "./TaskDetailSheet";

export function TaskDetailSheetMount() {
  const { selectedTask, setSelectedTask, workspace } = useBoardContext();
  const repository = `${workspace.owner}/${workspace.repo}`;
  return (
    <TaskDetailSheet
      task={selectedTask?.task ?? null}
      featureTitle={selectedTask?.featureTitle}
      repository={repository}
      onClose={() => setSelectedTask(null)}
    />
  );
}
