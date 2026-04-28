import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import type { WorkspaceConfig, WorkspaceSummary } from "@/types/workspace";
import type { FeatureStatus } from "@/types/feature";
import { listFeatures } from "@/lib/features";

function getWorkspaceScanRoot(): string {
  const root = process.env.WORKSPACE_SCAN_ROOT;
  if (!root) throw new Error("WORKSPACE_SCAN_ROOT is not set");
  return root;
}

export function loadWorkspaceConfig(workspaceRoot: string): WorkspaceConfig | null {
  const configPath = path.join(workspaceRoot, "workspace.yaml");
  if (!fs.existsSync(configPath)) return null;
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    return yaml.load(raw) as WorkspaceConfig;
  } catch {
    return null;
  }
}

export function scanWorkspaces(): Array<{ rootPath: string; config: WorkspaceConfig }> {
  const scanRoot = getWorkspaceScanRoot();
  if (!fs.existsSync(scanRoot)) return [];

  const entries = fs.readdirSync(scanRoot, { withFileTypes: true });
  const results: Array<{ rootPath: string; config: WorkspaceConfig }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const workspaceRoot = path.join(scanRoot, entry.name);
    const config = loadWorkspaceConfig(workspaceRoot);
    if (config) {
      results.push({ rootPath: workspaceRoot, config });
    }
  }

  return results;
}

export async function getWorkspaceSummaries(): Promise<WorkspaceSummary[]> {
  const workspaces = scanWorkspaces();
  const summaries: WorkspaceSummary[] = [];

  for (const { rootPath, config } of workspaces) {
    let features: { featureStatus: FeatureStatus }[] = [];
    try {
      features = await listFeatures(config.workspace_id, rootPath);
    } catch {
      features = [];
    }

    const total = features.length;
    const inProgress = features.filter(
      (f) =>
        f.featureStatus === "in_implementation" ||
        f.featureStatus === "in_design" ||
        f.featureStatus === "in_tdd" ||
        f.featureStatus === "ready_for_implementation" ||
        f.featureStatus === "in_handoff"
    ).length;
    const blocked = features.filter((f) => f.featureStatus === "blocked").length;
    const done = features.filter((f) => f.featureStatus === "done").length;

    summaries.push({
      workspaceId: config.workspace_id,
      name: config.name,
      rootPath,
      totalFeatures: total,
      inProgressFeatures: inProgress,
      blockedFeatures: blocked,
      doneFeatures: done,
    });
  }

  return summaries;
}

export function getWorkspaceByIdFromScan(workspaceId: string): {
  rootPath: string;
  config: WorkspaceConfig;
} | null {
  const workspaces = scanWorkspaces();
  return workspaces.find((w) => w.config.workspace_id === workspaceId) ?? null;
}

export function listWorkspaceIds(): string[] {
  try {
    return scanWorkspaces().map((w) => w.config.workspace_id);
  } catch {
    return [];
  }
}
