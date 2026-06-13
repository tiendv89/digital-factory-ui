"use client";

import { CheckCircle, MessageSquare, RotateCcw, XCircle } from "lucide-react";
import { useState } from "react";

import { stageTransition } from "@/services/hermes-agent/tools";

export type ApprovalRequest = {
  feature_id: string;
  stage: string;
  review_status: string;
};

type ApprovalCardProps = {
  output: ApprovalRequest;
  onTransitionSuccess?: () => void;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  awaiting_approval: "Awaiting Approval",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "text-text-muted",
  awaiting_approval: "text-warning",
  approved: "text-success",
  rejected: "text-danger",
};

const STAGE_LABELS: Record<string, string> = {
  product_spec: "Product Spec",
  technical_design: "Technical Design",
  tasks: "Tasks",
  handoff: "Handoff",
};

export function ApprovalCard({ output, onTransitionSuccess }: ApprovalCardProps) {
  const [pending, setPending] = useState<"approve" | "reject" | "reopen" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const { feature_id, stage, review_status } = output;
  const stageLabel = STAGE_LABELS[stage] ?? stage;
  const statusLabel = STATUS_LABELS[review_status] ?? review_status;
  const statusColor = STATUS_COLORS[review_status] ?? "text-text-muted";

  const handleApprove = async () => {
    setPending("approve");
    setError(null);
    try {
      await stageTransition(feature_id, { stage, action: "approve" });
      onTransitionSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setPending(null);
    }
  };

  const handleReject = async () => {
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    setPending("reject");
    setError(null);
    try {
      await stageTransition(feature_id, { stage, action: "reject", comment: rejectComment || undefined });
      onTransitionSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setPending(null);
      setShowRejectInput(false);
    }
  };

  const handleReopen = async () => {
    setPending("reopen");
    setError(null);
    try {
      await stageTransition(feature_id, { stage, action: "reopen" });
      onTransitionSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reopen failed");
    } finally {
      setPending(null);
    }
  };

  const isDisabled = pending !== null;

  return (
    <div data-approval-card className="mt-1 rounded-lg border border-border bg-surface p-3 text-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-text-primary">Approval Request</p>
          <p className="text-xs text-text-muted">
            Stage: <span className="font-medium text-text-secondary">{stageLabel}</span>
          </p>
        </div>
        <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
      </div>

      {showRejectInput && (
        <div className="mb-2">
          <textarea
            className="w-full rounded border border-border bg-surface-secondary px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary/40"
            rows={2}
            placeholder="Rejection comment (optional)"
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
          />
        </div>
      )}

      {error && <p className="mb-2 text-xs text-danger">{error}</p>}

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          data-approval-action="approve"
          disabled={isDisabled}
          onClick={() => void handleApprove()}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-success transition-colors hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle className="h-3 w-3" />
          {pending === "approve" ? "Approving…" : "Approve"}
        </button>

        <button
          type="button"
          data-approval-action="reject"
          disabled={isDisabled && pending !== null}
          onClick={() => void handleReject()}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {showRejectInput ? <MessageSquare className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {pending === "reject" ? "Rejecting…" : showRejectInput ? "Submit Rejection" : "Reject"}
        </button>

        <button
          type="button"
          data-approval-action="reopen"
          disabled={isDisabled}
          onClick={() => void handleReopen()}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-3 w-3" />
          {pending === "reopen" ? "Reopening…" : "Re-open"}
        </button>
      </div>
    </div>
  );
}
