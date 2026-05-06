import {
  GitHubAccessError,
  GitHubApiError,
  GitHubNotFoundError,
  type GitHubEntry,
} from "@/services/github";
import {
  parseFeatureStatus,
  parseTaskYaml,
  type ParsedFeature,
  type ParsedTask,
} from "@/services/yaml-parser";
import type { BoardLoadError } from "../types";

export interface BoardDataClient {
  listDirectory(path: string): Promise<GitHubEntry[]>;
  getFileContent(path: string): Promise<string>;
}

const FEATURES_ROOT = "docs/features";

export class BoardLoadFailure extends Error {
  constructor(public readonly error: BoardLoadError) {
    super(error.message);
    this.name = "BoardLoadFailure";
  }
}

export function mapClientError(err: unknown): BoardLoadError {
  if (err instanceof GitHubAccessError) {
    return { kind: "access_denied", message: err.message };
  }
  if (err instanceof GitHubNotFoundError) {
    return { kind: "not_found", message: err.message };
  }
  if (err instanceof GitHubApiError) {
    return { kind: "network_error", message: err.message };
  }
  if (err instanceof Error) {
    return { kind: "network_error", message: err.message };
  }
  return { kind: "network_error", message: "Unknown error" };
}

async function loadFeature(
  client: BoardDataClient,
  featureDir: GitHubEntry,
): Promise<ParsedFeature> {
  const featureId = featureDir.name;
  const statusPath = `${featureDir.path}/status.yaml`;
  const tasksPath = `${featureDir.path}/tasks`;

  const [statusRaw, taskEntries] = await Promise.all([
    client.getFileContent(statusPath).catch((err: unknown) => {
      if (err instanceof GitHubNotFoundError) return "";
      throw err;
    }),
    client.listDirectory(tasksPath).catch((err: unknown) => {
      if (err instanceof GitHubNotFoundError) return [] as GitHubEntry[];
      throw err;
    }),
  ]);

  let featureStatus = "unknown";
  let title = featureId;
  if (statusRaw) {
    try {
      const parsed = parseFeatureStatus(statusRaw);
      if (parsed.feature_status) featureStatus = parsed.feature_status;
      if (parsed.title) title = parsed.title;
    } catch (err) {
      throw new BoardLoadFailure({
        kind: "parse_error",
        message: `Failed to parse status.yaml for ${featureId}: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  const yamlEntries = taskEntries.filter(
    (entry) => entry.type === "file" && entry.name.endsWith(".yaml"),
  );

  const tasks = await Promise.all(
    yamlEntries.map(async (entry) => {
      const id = entry.name.replace(/\.yaml$/, "");
      const raw = await client.getFileContent(entry.path);
      return parseTaskYaml(id, raw);
    }),
  );

  return {
    id: featureId,
    title,
    featureStatus,
    tasks: tasks.filter((t): t is ParsedTask => t !== null),
  };
}

export async function fetchBoardData(
  client: BoardDataClient,
): Promise<ParsedFeature[]> {
  let rootEntries: GitHubEntry[];
  try {
    rootEntries = await client.listDirectory(FEATURES_ROOT);
  } catch (err) {
    throw new BoardLoadFailure(mapClientError(err));
  }

  const featureDirs = rootEntries.filter((entry) => entry.type === "dir");

  let features: ParsedFeature[];
  try {
    features = await Promise.all(
      featureDirs.map((dir) => loadFeature(client, dir)),
    );
  } catch (err) {
    if (err instanceof BoardLoadFailure) throw err;
    throw new BoardLoadFailure(mapClientError(err));
  }

  features.sort((a, b) => a.id.localeCompare(b.id));
  return features;
}
