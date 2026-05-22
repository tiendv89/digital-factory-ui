import type { TaskTabEntry, FeatureTabEntry } from "@/features/workspaces/context/WorkspaceContext";

/** Add a task tab session. Multiple sessions may point to the same task. */
export function addTaskTab(tabs: TaskTabEntry[], entry: TaskTabEntry): TaskTabEntry[] {
  return [...tabs, entry];
}

/** Remove a task tab by sessionId. */
export function removeTaskTab(tabs: TaskTabEntry[], sessionId: string): TaskTabEntry[] {
  return tabs.filter((t) => t.sessionId !== sessionId);
}

/** Add a feature tab session. Multiple sessions may point to the same feature. */
export function addFeatureTab(tabs: FeatureTabEntry[], entry: FeatureTabEntry): FeatureTabEntry[] {
  return [...tabs, entry];
}

/** Remove a feature tab by sessionId. */
export function removeFeatureTab(tabs: FeatureTabEntry[], sessionId: string): FeatureTabEntry[] {
  return tabs.filter((f) => f.sessionId !== sessionId);
}

export function createTabSessionId(prefix: "task" | "feature"): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${id}`;
}

export function getTaskTabHref(entry: TaskTabEntry): string {
  const params = new URLSearchParams({
    workspaceId: entry.workspaceId,
    taskId: entry.taskId,
  });
  if (entry.featureId) params.set("featureId", entry.featureId);
  return `/task/${encodeURIComponent(entry.sessionId)}?${params.toString()}`;
}

export function getFeatureTabHref(entry: FeatureTabEntry): string {
  const params = new URLSearchParams({
    workspaceId: entry.workspaceId,
    featureId: entry.featureId,
  });
  return `/feature/${encodeURIComponent(entry.sessionId)}?${params.toString()}`;
}
