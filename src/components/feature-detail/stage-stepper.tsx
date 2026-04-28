import type { FeatureStatusYaml, LifecycleStage, StageReviewStatus } from "@/types/feature";
import { formatStageLabel } from "@/lib/utils";

const STAGES: LifecycleStage[] = ["product_spec", "technical_design", "tasks", "handoff"];

const REVIEW_BADGE: Record<StageReviewStatus, { className: string; label: string }> = {
  approved: { className: "bg-success-bg text-success", label: "Approved" },
  awaiting_approval: { className: "bg-warning-bg text-warning", label: "Awaiting Approval" },
  rejected: { className: "bg-danger-bg text-danger", label: "Rejected" },
  draft: { className: "bg-border text-text-muted", label: "Draft" },
};

interface StageStepperProps {
  status: FeatureStatusYaml;
}

export function StageStepper({ status }: StageStepperProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface px-8 py-6">
      <div className="flex items-start">
        {STAGES.map((stage, idx) => {
          const review = status.stages[stage];
          const isCompleted = review.review_status === "approved";
          const isCurrent = status.current_stage === stage;
          const isLast = idx === STAGES.length - 1;
          const badge = REVIEW_BADGE[review.review_status];

          let circleClass: string;
          let circleContent: string;
          if (isCompleted) {
            circleClass = "bg-success text-white";
            circleContent = "✓";
          } else if (isCurrent) {
            circleClass = "bg-primary text-white";
            circleContent = String(idx + 1);
          } else {
            circleClass = "bg-border text-text-muted";
            circleContent = String(idx + 1);
          }

          return (
            <div key={stage} className="flex min-w-0 flex-1 items-start">
              {/* Step */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${circleClass}`}
                >
                  {circleContent}
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <span
                    className={`text-[11px] font-medium leading-none ${isCurrent ? "text-text-primary" : "text-text-secondary"}`}
                  >
                    {formatStageLabel(stage)}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-none ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="mt-4 min-w-0 flex-1 px-3">
                  <div className={`h-px w-full ${isCompleted ? "bg-success" : "bg-border"}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
