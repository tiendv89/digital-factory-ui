import { scanWorkspaces } from "@/lib/workspace";
import { listAllTasksWithContext } from "@/lib/tasks";
import { listFeatures } from "@/lib/features";
import { TasksContent } from "./tasks-content";
import type { TaskCardData } from "@/components/task-board/task-card";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const workspaces = scanWorkspaces();

  const workspacesData = await Promise.all(
    workspaces.map(async ({ rootPath, config }) => {
      const tasks = listAllTasksWithContext(rootPath);

      const features = await listFeatures(config.workspace_id, rootPath);
      const featureTitleMap = Object.fromEntries(
        features.map((f) => [f.featureId, f.title]),
      );

      const repos = Array.from(new Set(tasks.map((t) => t.repo))).sort();

      const taskCards: TaskCardData[] = tasks.map((t) => ({
        id: t.id,
        title: t.title,
        featureId: t.featureId,
        repo: t.repo,
        status: t.status,
        actorType: t.execution.actor_type,
        dependsOnCount: t.depends_on.length,
        prUrl: t.pr?.url ?? null,
      }));

      const featureOptions = features.map((f) => ({
        id: f.featureId,
        title: featureTitleMap[f.featureId] ?? f.featureId,
      }));

      return {
        workspaceId: config.workspace_id,
        tasks: taskCards,
        features: featureOptions,
        repos,
      };
    }),
  );

  return <TasksContent workspacesData={workspacesData} />;
}
