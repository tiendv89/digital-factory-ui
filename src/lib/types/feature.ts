export type FeatureStatus =
  | "draft"
  | "in_design"
  | "in_tdd"
  | "ready_for_implementation"
  | "in_implementation"
  | "blocked"
  | "done";

export type ReviewStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "not_required";

export interface ReviewHistoryEntry {
  status?: string;
  action?: string;
  by: string;
  at: string;
  comment: string | null;
}

export interface StageInfo {
  review_status: ReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  review_history: ReviewHistoryEntry[];
}

export interface HistoryEntry {
  stage?: string;
  action: string;
  by: string;
  at: string;
  note: string | null;
}

export interface RevalidationInfo {
  product_spec_required: boolean;
  technical_design_required: boolean;
  tasks_required: boolean;
  deployment_checklist_required: boolean;
}

export interface Feature {
  feature_id: string;
  title: string;
  feature_status: FeatureStatus;
  current_stage: string;
  next_action: string | null;
  stages: {
    product_spec?: StageInfo;
    technical_design?: StageInfo;
    tasks?: StageInfo;
    handoff?: StageInfo;
    [key: string]: StageInfo | undefined;
  };
  history: HistoryEntry[];
  revalidation: RevalidationInfo;
}

export interface FeatureSummary extends Feature {
  taskCounts: {
    total: number;
    done: number;
    blocked: number;
    ready: number;
    in_progress: number;
    in_review: number;
  };
}
