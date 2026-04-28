export type TaskStatus =
  | "todo"
  | "ready"
  | "in_progress"
  | "blocked"
  | "in_review"
  | "done"
  | "cancelled";

export type ActorType = "human" | "agent" | "either";

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
  cost_usd: number;
}

export interface LogEntry {
  action: string;
  by: string;
  at: string;
  note?: string | null;
  rag_context_injected?: boolean;
  tokens?: TokenUsage;
}

export interface TaskPr {
  url: string | null;
  status: string | null;
}

export interface TaskExecution {
  actor_type: ActorType;
  last_updated_by?: string;
  last_updated_at?: string;
}

export interface BlockedContext {
  wip_branch: string;
  wip_sha: string;
  pushed_at: string;
}

export interface TaskYaml {
  id: string;
  title: string;
  repo: string;
  status: TaskStatus;
  depends_on: string[];
  blocked_reason: string | null;
  blocked_context: BlockedContext | null;
  branch: string;
  execution: TaskExecution;
  pr: TaskPr;
  workspace_pr?: TaskPr;
  log: LogEntry[];
}
