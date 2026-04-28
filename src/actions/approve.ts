"use server";

import path from "path";
import { revalidatePath } from "next/cache";
import type { LifecycleStage, StageReviewStatus } from "@/types/feature";
import { loadFeatureStatus, writeFeatureStatus } from "@/lib/features";
import { gitCommitAndPush } from "@/lib/git";
import { getWorkspaceByIdFromScan } from "@/lib/workspace";

interface ApproveResult {
  ok: boolean;
  error?: string;
}

export async function approveStage(
  workspaceId: string,
  featureId: string,
  stage: LifecycleStage,
  action: "approve" | "reject" | "reset",
  comment?: string
): Promise<ApproveResult> {
  const workspace = getWorkspaceByIdFromScan(workspaceId);
  if (!workspace) return { ok: false, error: `Workspace not found: ${workspaceId}` };

  const { rootPath } = workspace;
  const status = loadFeatureStatus(rootPath, featureId);
  if (!status) return { ok: false, error: `Feature not found: ${featureId}` };

  const reviewer = process.env.GIT_AUTHOR_EMAIL ?? "unknown@local";
  const reviewedAt = new Date().toISOString();

  let newReviewStatus: StageReviewStatus;
  if (action === "approve") newReviewStatus = "approved";
  else if (action === "reject") newReviewStatus = "rejected";
  else newReviewStatus = "draft";

  const stageData = status.stages[stage];
  stageData.review_status = newReviewStatus;
  stageData.reviewed_by = reviewer;
  stageData.reviewed_at = reviewedAt;
  stageData.review_comment = comment ?? null;
  stageData.review_history.push({
    status: newReviewStatus,
    by: reviewer,
    at: reviewedAt,
    comment: comment ?? null,
  });

  status.history.push({
    action,
    stage,
    by: reviewer,
    at: reviewedAt,
    note: comment ?? null,
  });

  try {
    writeFeatureStatus(rootPath, featureId, status);
  } catch (err) {
    return { ok: false, error: `Failed to write status.yaml: ${String(err)}` };
  }

  const statusFilePath = path.join(rootPath, "docs", "features", featureId, "status.yaml");
  const featureBranch = `feature/${featureId}`;
  const commitMessage = `${action}(${featureId}): ${action} ${stage} stage`;

  try {
    await gitCommitAndPush({
      repoPath: rootPath,
      branch: featureBranch,
      files: [statusFilePath],
      message: commitMessage,
    });
  } catch (err) {
    return { ok: false, error: `Git commit failed: ${String(err)}` };
  }

  revalidatePath(`/features/${featureId}`);
  revalidatePath("/features");

  return { ok: true };
}
