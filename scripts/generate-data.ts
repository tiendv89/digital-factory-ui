/**
 * generate-data.ts
 *
 * Build-time script that reads feature and task YAML files from the management
 * repo and writes pre-generated JSON under public/data/ so that the static
 * export has no Node.js fs dependency at runtime.
 *
 * Run before `next build` when NEXT_PUBLIC_DATA_SOURCE=static:
 *   npm run generate-data
 *
 * Required env:
 *   WORKSPACE_MGMT_PATH — path to the local management repo clone
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";

// ---------------------------------------------------------------------------
// Minimal type shapes — mirrors src/lib/types/* but kept local to this script
// so it has no dependency on Next.js internals.
// ---------------------------------------------------------------------------

interface ReviewHistoryEntry {
  status?: string;
  action?: string;
  by: string;
  at: string;
  comment: string | null;
}

interface StageInfo {
  review_status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  review_history: ReviewHistoryEntry[];
}

interface Feature {
  feature_id: string;
  title: string;
  feature_status: string;
  current_stage: string;
  next_action: string | null;
  stages: Record<string, StageInfo | undefined>;
  history: Array<{ action: string; by: string; at: string; note: string | null }>;
  revalidation: {
    product_spec_required: boolean;
    technical_design_required: boolean;
    tasks_required: boolean;
    deployment_checklist_required: boolean;
  };
}

interface Task {
  id: string;
  title: string;
  repo: string;
  status: string;
  depends_on: string[];
  blocked_reason: string | null;
  blocked_context: unknown;
  branch: string;
  execution: {
    actor_type: string | null;
    last_updated_by: string | null;
    last_updated_at: string | null;
  };
  pr: { url: string; status: string };
  workspace_pr: { url: string; status: string } | null;
  log: Array<{ action: string; by: string; at: string; note: string | null }>;
}

interface TaskCounts {
  total: number;
  done: number;
  blocked: number;
  ready: number;
  in_progress: number;
  in_review: number;
}

interface FeatureSummary extends Feature {
  taskCounts: TaskCounts;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
        `Set it to the local path of your management repo clone.`
    );
  }
  return value;
}

function loadYaml<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf-8");
  return yaml.load(raw) as T;
}

function loadFeature(featureDir: string): Feature | null {
  const statusPath = path.join(featureDir, "status.yaml");
  if (!fs.existsSync(statusPath)) return null;
  return loadYaml<Feature>(statusPath);
}

function loadTasks(featureDir: string): Task[] {
  const tasksDir = path.join(featureDir, "tasks");
  if (!fs.existsSync(tasksDir)) return [];
  const files = fs.readdirSync(tasksDir).filter((f) => f.endsWith(".yaml"));
  return files.map((f) => loadYaml<Task>(path.join(tasksDir, f)));
}

function computeTaskCounts(tasks: Task[]): TaskCounts {
  const counts: TaskCounts = {
    total: tasks.length,
    done: 0,
    blocked: 0,
    ready: 0,
    in_progress: 0,
    in_review: 0,
  };
  for (const task of tasks) {
    if (task.status === "done") counts.done++;
    else if (task.status === "blocked") counts.blocked++;
    else if (task.status === "ready") counts.ready++;
    else if (task.status === "in_progress") counts.in_progress++;
    else if (task.status === "in_review") counts.in_review++;
  }
  return counts;
}

function writeJson(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`  wrote ${path.relative(process.cwd(), filePath)}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const mgmtPath = requireEnv("WORKSPACE_MGMT_PATH");
  const featuresDir = path.join(mgmtPath, "docs", "features");

  if (!fs.existsSync(featuresDir)) {
    throw new Error(`Features directory not found: ${featuresDir}`);
  }

  const outDir = path.join(process.cwd(), "public", "data");
  console.log(`Generating static data from ${featuresDir} → ${outDir}`);

  const entries = fs.readdirSync(featuresDir, { withFileTypes: true });
  const summaries: FeatureSummary[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const featureDir = path.join(featuresDir, entry.name);
    const feature = loadFeature(featureDir);
    if (!feature) continue;

    const tasks = loadTasks(featureDir);
    const taskCounts = computeTaskCounts(tasks);
    const summary: FeatureSummary = { ...feature, taskCounts };
    summaries.push(summary);

    // Write per-feature task file
    writeJson(
      path.join(outDir, "features", feature.feature_id, "tasks.json"),
      tasks
    );
  }

  // Write feature list (with task counts)
  writeJson(path.join(outDir, "features.json"), summaries);

  console.log(
    `Done — generated data for ${summaries.length} feature(s).`
  );
}

main();
