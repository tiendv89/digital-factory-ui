type LogEntry = {
  action: string;
  by: string;
  at: string;
  note?: string;
};

type ParsedFeatureActivityEntry = LogEntry & {
  targetId: string;
  targetTitle: string;
  scope?: string;
};

export type ParsedTask = {
  id: string;
  title: string;
  status: string;
  dependsOn: string[];
  description?: string;
  priority?: string;
  execution?: { actor_type: string; last_updated_by?: string; last_updated_at?: string };
  branch?: string;
  pr?: { url?: string; status?: string };
  workspace_pr?: { url?: string; status?: string };
  blockedReason?: string;
  blockedContext?: Record<string, unknown>;
  log?: LogEntry[];
  backendId?: string;
  featureBackendId?: string;
  repo?: string;
  updatedAt?: string;
};

export type ParsedFeature = {
  id: string;
  title: string;
  featureStatus: string;
  tasks: ParsedTask[];
  activity?: ParsedFeatureActivityEntry[];
  backendId?: string;
  currentStage?: string;
  taskCounts?: {
    total: number;
    done: number;
    in_progress: number;
    blocked: number;
    ready: number;
    todo: number;
  };
  updatedAt?: string;
};
