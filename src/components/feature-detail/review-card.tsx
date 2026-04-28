"use client";

import { useTransition } from "react";
import { approveStage } from "@/actions/approve";
import type { LifecycleStage, StageReview, StageReviewStatus } from "@/types/feature";
import { formatStageLabel } from "@/lib/utils";

const REVIEW_BADGE: Record<StageReviewStatus, { className: string; label: string }> = {
  approved: { className: "bg-success-bg text-success", label: "Approved" },
  awaiting_approval: { className: "bg-warning-bg text-warning", label: "Awaiting Approval" },
  rejected: { className: "bg-danger-bg text-danger", label: "Rejected" },
  draft: { className: "bg-border text-text-muted", label: "Draft" },
};

const DRAFT_REVIEW: StageReview = {
  review_status: "draft",
  reviewed_by: null,
  reviewed_at: null,
  review_comment: null,
  review_history: [],
};

interface ReviewCardProps {
  workspaceId: string;
  featureId: string;
  stage: LifecycleStage;
  review?: StageReview | null;
}

export function ReviewCard({ workspaceId, featureId, stage, review }: ReviewCardProps) {
  const [isPending, startTransition] = useTransition();
  const resolved = review ?? DRAFT_REVIEW;
  const badge = REVIEW_BADGE[resolved.review_status];

  function handleAction(action: "approve" | "reject" | "reset") {
    startTransition(async () => {
      await approveStage(workspaceId, featureId, stage, action);
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex flex-col gap-5 p-8">
        {/* Stage + review status */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-text-muted">Stage</span>
            <span className="text-[18px] font-semibold text-text-primary">
              {formatStageLabel(stage)}
            </span>
          </div>
          <span
            className={`ml-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium leading-none ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>

        {/* Reviewer + reviewed at */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-normal text-text-muted">Reviewed By</span>
            <span className="text-[14px] font-normal text-text-primary">
              {resolved.reviewed_by ?? "—"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-normal text-text-muted">Reviewed At</span>
            <span className="text-[14px] font-normal text-text-primary">
              {resolved.reviewed_at
                ? new Date(resolved.reviewed_at).toLocaleDateString("en-CA")
                : "—"}
            </span>
          </div>
        </div>

        {/* Comment */}
        {resolved.review_comment && (
          <div className="rounded-lg bg-surface-secondary px-4 py-3 text-[14px] font-normal text-text-secondary">
            {resolved.review_comment}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAction("approve")}
            disabled={isPending}
            className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-white transition-opacity disabled:opacity-50 hover:opacity-90"
          >
            Approve
          </button>
          <button
            onClick={() => handleAction("reject")}
            disabled={isPending}
            className="rounded-lg bg-danger px-4 py-2 text-[13px] font-medium text-white transition-opacity disabled:opacity-50 hover:opacity-90"
          >
            Reject
          </button>
          <button
            onClick={() => handleAction("reset")}
            disabled={isPending}
            className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors disabled:opacity-50 hover:bg-bg"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
