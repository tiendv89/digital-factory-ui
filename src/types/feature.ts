export type FeatureStatus =
  | "in_design"
  | "in_tdd"
  | "ready_for_implementation"
  | "in_implementation"
  | "in_handoff"
  | "done"
  | "blocked"
  | "cancelled";

export type LifecycleStage =
  | "product_spec"
  | "technical_design"
  | "tasks"
  | "handoff";

export type StageReviewStatus = "draft" | "awaiting_approval" | "approved" | "rejected";

export interface ReviewHistoryEntry {
  status: StageReviewStatus;
  by: string;
  at: string;
  comment: string | null;
}

export interface StageReview {
  review_status: StageReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  review_history: ReviewHistoryEntry[];
}

export interface FeatureRevalidation {
  product_spec_required: boolean;
  technical_design_required: boolean;
  tasks_required: boolean;
  deployment_checklist_required: boolean;
}

export interface FeatureHistoryEntry {
  action: string;
  stage: LifecycleStage;
  by: string;
  at: string;
  note: string | null;
}

export interface FeatureStatusYaml {
  feature_id: string;
  title: string;
  feature_status: FeatureStatus;
  current_stage: LifecycleStage;
  next_action: string | null;
  stages: {
    product_spec: StageReview;
    technical_design: StageReview;
    tasks: StageReview;
    handoff: StageReview;
  };
  history: FeatureHistoryEntry[];
  revalidation: FeatureRevalidation;
}

export interface FeatureSummary {
  featureId: string;
  title: string;
  featureStatus: FeatureStatus;
  currentStage: LifecycleStage;
  currentStageReviewStatus: StageReviewStatus | null;
  nextAction: string | null;
  tasksDone: number;
  tasksTotal: number;
  workspaceId: string;
  workspaceRoot: string;
  lastUpdatedAt: string | null;
}
