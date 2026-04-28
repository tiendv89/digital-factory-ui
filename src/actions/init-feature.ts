"use server";

import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { revalidatePath } from "next/cache";
import { gitCommitAndPush, ensureBranch } from "@/lib/git";
import { getWorkspaceByIdFromScan } from "@/lib/workspace";

interface InitFeatureParams {
  workspaceId: string;
  featureId: string;
  title: string;
  description?: string;
}

interface InitFeatureResult {
  ok: boolean;
  error?: string;
}

const STATUS_YAML_TEMPLATE = (featureId: string, title: string) => ({
  feature_id: featureId,
  title,
  feature_status: "in_design",
  current_stage: "product_spec",
  next_action: "Product owner produces product-spec.md",
  stages: {
    product_spec: {
      review_status: "draft",
      reviewed_by: null,
      reviewed_at: null,
      review_comment: null,
      review_history: [],
    },
    technical_design: {
      review_status: "draft",
      reviewed_by: null,
      reviewed_at: null,
      review_comment: null,
      review_history: [],
    },
    tasks: {
      review_status: "draft",
      reviewed_by: null,
      reviewed_at: null,
      review_comment: null,
      review_history: [],
    },
    handoff: {
      review_status: "draft",
      reviewed_by: null,
      reviewed_at: null,
      review_comment: null,
      review_history: [],
    },
  },
  history: [],
  revalidation: {
    product_spec_required: false,
    technical_design_required: false,
    tasks_required: false,
    deployment_checklist_required: false,
  },
});

export async function initFeature(params: InitFeatureParams): Promise<InitFeatureResult> {
  const { workspaceId, featureId, title, description } = params;

  const workspace = getWorkspaceByIdFromScan(workspaceId);
  if (!workspace) return { ok: false, error: `Workspace not found: ${workspaceId}` };

  const { rootPath } = workspace;
  const featureDir = path.join(rootPath, "docs", "features", featureId);

  if (fs.existsSync(featureDir)) {
    return { ok: false, error: `Feature already exists: ${featureId}` };
  }

  const tasksDir = path.join(featureDir, "tasks");
  const handoffsDir = path.join(featureDir, "handoffs");
  const logsDir = path.join(featureDir, "logs");

  try {
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.mkdirSync(handoffsDir, { recursive: true });
    fs.mkdirSync(logsDir, { recursive: true });
  } catch (err) {
    return { ok: false, error: `Failed to create directories: ${String(err)}` };
  }

  const statusData = STATUS_YAML_TEMPLATE(featureId, title);
  const statusPath = path.join(featureDir, "status.yaml");
  try {
    fs.writeFileSync(statusPath, yaml.dump(statusData, { lineWidth: 120, noRefs: true }), "utf-8");
  } catch (err) {
    return { ok: false, error: `Failed to write status.yaml: ${String(err)}` };
  }

  const productSpecContent = `# Product Spec — ${title}\n\n${description ?? ""}\n`;
  const productSpecPath = path.join(featureDir, "product-spec.md");
  try {
    fs.writeFileSync(productSpecPath, productSpecContent, "utf-8");
  } catch (err) {
    return { ok: false, error: `Failed to write product-spec.md: ${String(err)}` };
  }

  const featureBranch = `feature/${featureId}`;

  try {
    await ensureBranch(rootPath, featureBranch);
  } catch {
    // Branch creation is best-effort; continue with commit attempt
  }

  const commitMessage = `feat(${featureId}): scaffold feature directory`;

  try {
    await gitCommitAndPush({
      repoPath: rootPath,
      branch: featureBranch,
      files: [statusPath, productSpecPath],
      message: commitMessage,
    });
  } catch (err) {
    return { ok: false, error: `Git commit failed: ${String(err)}` };
  }

  revalidatePath("/features");

  return { ok: true };
}
