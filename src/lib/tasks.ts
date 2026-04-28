import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import type { TaskYaml, TaskStatus } from "@/types/task";

function getTasksDir(workspaceRoot: string, featureId: string): string {
  return path.join(workspaceRoot, "docs", "features", featureId, "tasks");
}

export function loadTask(workspaceRoot: string, featureId: string, taskId: string): TaskYaml | null {
  const taskPath = path.join(getTasksDir(workspaceRoot, featureId), `${taskId}.yaml`);
  if (!fs.existsSync(taskPath)) return null;
  try {
    const raw = fs.readFileSync(taskPath, "utf-8");
    return yaml.load(raw) as TaskYaml;
  } catch {
    return null;
  }
}

export function listTasks(workspaceRoot: string, featureId: string, filters?: { status?: TaskStatus }): TaskYaml[] {
  const tasksDir = getTasksDir(workspaceRoot, featureId);
  if (!fs.existsSync(tasksDir)) return [];

  const entries = fs.readdirSync(tasksDir, { withFileTypes: true });
  const tasks: TaskYaml[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".yaml")) continue;
    const taskId = entry.name.replace(/\.yaml$/, "");
    const task = loadTask(workspaceRoot, featureId, taskId);
    if (!task) continue;
    if (filters?.status && task.status !== filters.status) continue;
    tasks.push(task);
  }

  return tasks.sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, ""), 10);
    const numB = parseInt(b.id.replace(/\D/g, ""), 10);
    return numA - numB;
  });
}

export function listAllTasks(workspaceRoot: string): TaskYaml[] {
  const featuresDir = path.join(workspaceRoot, "docs", "features");
  if (!fs.existsSync(featuresDir)) return [];

  const featureEntries = fs.readdirSync(featuresDir, { withFileTypes: true });
  const allTasks: TaskYaml[] = [];

  for (const entry of featureEntries) {
    if (!entry.isDirectory()) continue;
    const tasks = listTasks(workspaceRoot, entry.name);
    allTasks.push(...tasks);
  }

  return allTasks;
}
