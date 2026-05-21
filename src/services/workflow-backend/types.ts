export type SourceState = {
  stale: boolean;
  last_synced_at?: string;
  error_code?: string;
};

export type TaskCounts = {
  total: number;
  done: number;
  in_progress: number;
  blocked: number;
  ready: number;
  todo: number;
};

export type PullRequestRef = {
  label: string;
  status: string;
  repo: string;
  url: string;
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  repo_url: string;
  source_state: SourceState;
  updated_at: string;
};

export type LocalWorkspaceSummary = {
  workspaceId: string;
  name: string;
  repo_url: string;
  default_branch: string;
  last_opened_at: string;
};

export type FeatureSummary = {
  id: string;
  feature_id: string;
  feature_name: string;
  title: string;
  status: string;
  current_stage: string;
  stages?: Array<{ id: string; status: string }>;
  updated_at: string;
  task_counts: TaskCounts;
};

export type FeatureDocument = {
  document_type: string;
  source_path: string;
  url: string;
};

export type TaskSummary = {
  id: string;
  task_id: string;
  task_name: string;
  feature_id: string;
  feature_name: string;
  title: string;
  status: string;
  repo: string;
  branch: string;
  is_blocked: boolean;
  pr: PullRequestRef | null;
  workspace_pr: PullRequestRef | null;
};

export type WorkspaceDetail = WorkspaceSummary & {
  features: FeatureSummary[];
  tasks: TaskSummary[];
};

export type FeatureDetail = FeatureSummary & {
  workspace_id: string;
  documents: FeatureDocument[];
  tasks: TaskSummary[];
  source_state: SourceState;
};

export type TaskExecution = {
  actor_type: string;
  last_updated_by?: string;
  last_updated_at?: string;
};

export type TaskDetail = TaskSummary & {
  next_action: string;
  blocked_reason: string;
  workspace_id: string;
  depends_on: string[];
  execution: TaskExecution;
  pr_refs: PullRequestRef[];
};

export type ImportWorkspaceRequest = {
  repo_url: string;
  default_branch?: string;
  name?: string;
};

export type ApiError = {
  code: string;
  message: string;
  retryable: boolean;
  path?: string;
  cached_data?: unknown;
};
