import { load as yamlLoad } from "js-yaml";

export type LogEntry = {
  action: string;
  by: string;
  at: string;
  note?: string;
};

export type ParsedTask = {
  id: string;
  title: string;
  status: string;
  dependsOn: string[];
  execution?: { actor_type: string; last_updated_by?: string; last_updated_at?: string };
  branch?: string;
  pr?: { url?: string; status?: string };
  workspace_pr?: { url?: string; status?: string };
  blockedReason?: string;
  log?: LogEntry[];
};

export type ParsedFeature = {
  id: string;
  title: string;
  featureStatus: string;
  tasks: ParsedTask[];
};

type RawFeatureStatus = {
  feature_id?: string;
  title?: string;
  feature_status?: string;
  stage?: string;
};

type RawTask = {
  id?: string;
  title?: string;
  status?: string;
  depends_on?: string[];
  execution?: { actor_type?: string; last_updated_by?: string; last_updated_at?: string };
  branch?: string;
  pr?: { url?: string; status?: string };
  workspace_pr?: { url?: string; status?: string };
  blocked_reason?: string;
  log?: Array<{ action?: string; by?: string; at?: string; note?: string }>;
};

export function parseFeatureStatus(raw: string): RawFeatureStatus {
  return (yamlLoad(raw) as RawFeatureStatus) ?? {};
}

export function parseTaskYaml(id: string, raw: string): ParsedTask | null {
  let data: RawTask;
  try {
    data = (yamlLoad(raw) as RawTask) ?? {};
  } catch (err) {
    console.warn(`[yaml-parser] Failed to parse task YAML for ${id}:`, err);
    return null;
  }

  if (!data || typeof data !== "object") {
    console.warn(`[yaml-parser] Malformed task YAML for ${id}: not an object`);
    return null;
  }

  const log: LogEntry[] | undefined = Array.isArray(data.log)
    ? data.log
        .filter(
          (e) =>
            e &&
            typeof e.action === "string" &&
            typeof e.by === "string" &&
            typeof e.at === "string",
        )
        .map((e) => ({
          action: e.action as string,
          by: e.by as string,
          at: e.at as string,
          ...(e.note !== undefined ? { note: e.note } : {}),
        }))
    : undefined;

  return {
    id: typeof data.id === "string" ? data.id : id,
    title: typeof data.title === "string" ? data.title : "",
    status: typeof data.status === "string" ? data.status : "unknown",
    dependsOn: Array.isArray(data.depends_on)
      ? data.depends_on.filter((d) => typeof d === "string")
      : [],
    ...(data.execution?.actor_type
      ? {
          execution: {
            actor_type: data.execution.actor_type,
            ...(typeof data.execution.last_updated_by === "string"
              ? { last_updated_by: data.execution.last_updated_by }
              : {}),
            ...(typeof data.execution.last_updated_at === "string"
              ? { last_updated_at: data.execution.last_updated_at }
              : {}),
          },
        }
      : {}),
    ...(typeof data.branch === "string" ? { branch: data.branch } : {}),
    ...(data.pr !== undefined ? { pr: data.pr } : {}),
    ...(data.workspace_pr !== undefined ? { workspace_pr: data.workspace_pr } : {}),
    ...(typeof data.blocked_reason === "string" && data.blocked_reason !== null
      ? { blockedReason: data.blocked_reason }
      : {}),
    ...(log !== undefined ? { log } : {}),
  };
}
