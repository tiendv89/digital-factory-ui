import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import type { FeatureStatusYaml, FeatureSummary, FeatureStatus, LifecycleStage } from "@/types/feature";

function getFeaturesDir(workspaceRoot: string): string {
  return path.join(workspaceRoot, "docs", "features");
}

export function loadFeatureStatus(workspaceRoot: string, featureId: string): FeatureStatusYaml | null {
  const statusPath = path.join(getFeaturesDir(workspaceRoot), featureId, "status.yaml");
  if (!fs.existsSync(statusPath)) return null;
  try {
    const raw = fs.readFileSync(statusPath, "utf-8");
    return yaml.load(raw) as FeatureStatusYaml;
  } catch {
    return null;
  }
}

export function writeFeatureStatus(workspaceRoot: string, featureId: string, data: FeatureStatusYaml): void {
  const statusPath = path.join(getFeaturesDir(workspaceRoot), featureId, "status.yaml");
  fs.writeFileSync(statusPath, yaml.dump(data, { lineWidth: 120, noRefs: true }), "utf-8");
}

export async function listFeatures(
  workspaceId: string,
  workspaceRoot: string,
  filters?: { featureStatus?: FeatureStatus; currentStage?: LifecycleStage }
): Promise<FeatureSummary[]> {
  const featuresDir = getFeaturesDir(workspaceRoot);
  if (!fs.existsSync(featuresDir)) return [];

  const entries = fs.readdirSync(featuresDir, { withFileTypes: true });
  const summaries: FeatureSummary[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const featureId = entry.name;
    const status = loadFeatureStatus(workspaceRoot, featureId);
    if (!status) continue;

    if (filters?.featureStatus && status.feature_status !== filters.featureStatus) continue;
    if (filters?.currentStage && status.current_stage !== filters.currentStage) continue;

    const lastHistoryEntry = status.history[status.history.length - 1];

    summaries.push({
      featureId,
      title: status.title,
      featureStatus: status.feature_status,
      currentStage: status.current_stage,
      nextAction: status.next_action ?? null,
      workspaceId,
      workspaceRoot,
      lastUpdatedAt: lastHistoryEntry?.at ?? null,
    });
  }

  return summaries.sort((a, b) => {
    if (!a.lastUpdatedAt) return 1;
    if (!b.lastUpdatedAt) return -1;
    return b.lastUpdatedAt.localeCompare(a.lastUpdatedAt);
  });
}

export async function getFeatureSummary(
  workspaceId: string,
  workspaceRoot: string,
  featureId: string
): Promise<FeatureSummary | null> {
  const status = loadFeatureStatus(workspaceRoot, featureId);
  if (!status) return null;

  const lastHistoryEntry = status.history[status.history.length - 1];

  return {
    featureId,
    title: status.title,
    featureStatus: status.feature_status,
    currentStage: status.current_stage,
    nextAction: status.next_action ?? null,
    workspaceId,
    workspaceRoot,
    lastUpdatedAt: lastHistoryEntry?.at ?? null,
  };
}
