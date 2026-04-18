import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import type { Feature, FeatureSummary } from "../types/feature";
import type { Task, TaskStatus } from "../types/task";
import type { FeatureRepository } from "./feature.repository";

function getWorkspaceMgmtPath(): string {
  const mgmtPath = process.env.WORKSPACE_MGMT_PATH;
  if (!mgmtPath) {
    throw new Error(
      "WORKSPACE_MGMT_PATH environment variable is not set. " +
        "Please set it to the local path of your management repo clone. " +
        "See .env.local.example for details."
    );
  }
  return mgmtPath;
}

function parseFeaturesDir(mgmtPath: string): string {
  return path.join(mgmtPath, "docs", "features");
}

function loadFeatureStatus(featureDir: string): Feature | null {
  const statusPath = path.join(featureDir, "status.yaml");
  if (!fs.existsSync(statusPath)) {
    return null;
  }
  const raw = fs.readFileSync(statusPath, "utf-8");
  return yaml.load(raw) as Feature;
}

function loadTasks(featureDir: string): Task[] {
  const tasksDir = path.join(featureDir, "tasks");
  if (!fs.existsSync(tasksDir)) {
    return [];
  }
  const files = fs.readdirSync(tasksDir).filter((f) => f.endsWith(".yaml"));
  return files.map((file) => {
    const raw = fs.readFileSync(path.join(tasksDir, file), "utf-8");
    return yaml.load(raw) as Task;
  });
}

function computeTaskCounts(tasks: Task[]): FeatureSummary["taskCounts"] {
  const counts = {
    total: tasks.length,
    done: 0,
    blocked: 0,
    ready: 0,
    in_progress: 0,
    in_review: 0,
  };
  for (const task of tasks) {
    const s = task.status as TaskStatus;
    if (s === "done") counts.done++;
    else if (s === "blocked") counts.blocked++;
    else if (s === "ready") counts.ready++;
    else if (s === "in_progress") counts.in_progress++;
    else if (s === "in_review") counts.in_review++;
  }
  return counts;
}

export class FilesystemFeatureRepository implements FeatureRepository {
  private getFeaturesDir(): string {
    return parseFeaturesDir(getWorkspaceMgmtPath());
  }

  async findAll(): Promise<FeatureSummary[]> {
    const featuresDir = this.getFeaturesDir();
    if (!fs.existsSync(featuresDir)) {
      return [];
    }

    const entries = fs.readdirSync(featuresDir, { withFileTypes: true });
    const summaries: FeatureSummary[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const featureDir = path.join(featuresDir, entry.name);
      const feature = loadFeatureStatus(featureDir);
      if (!feature) continue;
      const tasks = loadTasks(featureDir);
      const taskCounts = computeTaskCounts(tasks);
      summaries.push({ ...feature, taskCounts });
    }

    return summaries;
  }

  async findById(id: string): Promise<Feature | null> {
    const featuresDir = this.getFeaturesDir();
    const featureDir = path.join(featuresDir, id);
    if (!fs.existsSync(featureDir)) {
      return null;
    }
    return loadFeatureStatus(featureDir);
  }

  async findTasksByFeatureId(id: string): Promise<Task[]> {
    const featuresDir = this.getFeaturesDir();
    const featureDir = path.join(featuresDir, id);
    if (!fs.existsSync(featureDir)) {
      return [];
    }
    return loadTasks(featureDir);
  }
}
