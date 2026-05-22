import { TaskSessionPage } from "@/features/workspaces/components/WorkspaceSessionPage/TaskSessionPage";

type TaskRouteProps = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{
    workspaceId?: string;
    taskId?: string;
  }>;
};

export default async function TaskRoute({
  params,
  searchParams,
}: TaskRouteProps) {
  const { sessionId } = await params;
  const query = await searchParams;

  return (
    <TaskSessionPage
      sessionId={sessionId}
      workspaceId={query.workspaceId ?? ""}
      taskId={query.taskId ?? ""}
    />
  );
}
