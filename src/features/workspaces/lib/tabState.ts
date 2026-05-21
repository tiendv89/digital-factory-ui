import type { TaskTabEntry, FeatureTabEntry } from "@/features/workspaces/context/WorkspaceContext";

/** Add a task tab if it is not already open. Returns the same array reference if no change. */
export function addTaskTab(tabs: TaskTabEntry[], entry: TaskTabEntry): TaskTabEntry[] {
  const exists = tabs.find((t) => t.taskId === entry.taskId);
  if (exists) return tabs;
  return [...tabs, entry];
}

/** Remove a task tab by taskId. Returns the same array reference if not found. */
export function removeTaskTab(tabs: TaskTabEntry[], taskId: string): TaskTabEntry[] {
  return tabs.filter((t) => t.taskId !== taskId);
}

/** Add a feature tab if it is not already open. Returns the same array reference if no change. */
export function addFeatureTab(tabs: FeatureTabEntry[], entry: FeatureTabEntry): FeatureTabEntry[] {
  const exists = tabs.find((f) => f.featureId === entry.featureId);
  if (exists) return tabs;
  return [...tabs, entry];
}

/** Remove a feature tab by featureId. Returns the same array reference if not found. */
export function removeFeatureTab(tabs: FeatureTabEntry[], featureId: string): FeatureTabEntry[] {
  return tabs.filter((f) => f.featureId !== featureId);
}
