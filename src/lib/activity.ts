import type { ActivityEntry } from "@/types/activity";
import type { FeatureSummary } from "@/types/feature";
import { loadFeatureStatus } from "@/lib/features";
import { listTasks } from "@/lib/tasks";

export function buildActivityFeed(
  features: FeatureSummary[],
  workspaceRoot: string,
  limit = 20
): ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  let seq = 0;

  for (const feature of features) {
    const status = loadFeatureStatus(workspaceRoot, feature.featureId);
    if (!status) continue;

    for (const h of status.history) {
      entries.push({
        id: `feature-${feature.featureId}-${seq++}`,
        type: "feature",
        action: h.action,
        subject: feature.title,
        subjectId: feature.featureId,
        by: h.by,
        at: h.at,
        note: h.note ?? null,
      });
    }

    const tasks = listTasks(workspaceRoot, feature.featureId);
    for (const task of tasks) {
      for (const log of task.log ?? []) {
        entries.push({
          id: `task-${task.id}-${seq++}`,
          type: "task",
          action: log.action,
          subject: task.title,
          subjectId: task.id,
          by: log.by,
          at: log.at,
          note: log.note ?? null,
        });
      }
    }
  }

  entries.sort((a, b) => {
    const dateA = new Date(a.at).getTime();
    const dateB = new Date(b.at).getTime();
    return dateB - dateA;
  });

  return entries.slice(0, limit);
}
