import type { BoardLoadError } from "@/components/board/types";
import { GitHubAccessError, GitHubApiError, type GitHubEntry, GitHubNotFoundError, type GitHubPullRequest, type GitHubPullRequestFile } from "@/services/github";
import { type ParsedFeature, type ParsedTask, parseFeatureStatus, parseTaskYaml } from "@/services/yaml-parser";
import { normalizeFeatureLifecycleStatus } from "@/utils/workspaces/workspace-adapter";

export type BoardPullRequest = GitHubPullRequest;
export type BoardPullRequestFile = GitHubPullRequestFile;

type RefOptions = {
  ref?: string;
};

export interface BoardDataClient {
  listDirectory(path: string, options?: RefOptions): Promise<GitHubEntry[]>;
  getFileContent(path: string, options?: RefOptions): Promise<string>;
  listOpenPullRequests?(): Promise<BoardPullRequest[]>;
  listPullRequestFiles?(number: number): Promise<BoardPullRequestFile[]>;
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

async function loadFeature(client: BoardDataClient, featureDir: GitHubEntry): Promise<ParsedFeature> {
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
    const parsed = parseFeatureStatus(statusRaw, featureId);
    if (parsed.feature_status) {
      featureStatus = normalizeFeatureLifecycleStatus(parsed.feature_status);
    }
    if (parsed.title) title = parsed.title;
  }

  const yamlEntries = taskEntries.filter((entry) => entry.type === "file" && entry.name.endsWith(".yaml"));

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

type TaskLocation = {
  featureIndex: number;
  taskIndex: number;
  featureId: string;
  path: string;
  task: ParsedTask;
};

type PullRequestTaskFile = {
  featureId: string;
  taskId: string;
  path: string;
};

function normalizeTaskId(id: string): string {
  return id.trim().toUpperCase();
}

function parsePullRequestTaskFile(filename: string): PullRequestTaskFile | null {
  const match = filename.match(/(?:^|\/)docs\/features\/([^/]+)\/tasks\/(T\d+)[^/]*\.yaml$/i);
  if (!match) return null;

  return {
    featureId: match[1],
    taskId: match[2],
    path: filename,
  };
}

function extractTaskIdFromBranch(branch: string): string | null {
  const match = branch.match(/(?:^|[^a-z0-9])(T\d+)(?=$|[^a-z0-9])/i);
  return match ? normalizeTaskId(match[1]) : null;
}

function buildTaskLocations(features: ParsedFeature[]): TaskLocation[] {
  const locations: TaskLocation[] = [];

  features.forEach((feature, featureIndex) => {
    feature.tasks.forEach((task, taskIndex) => {
      locations.push({
        featureIndex,
        taskIndex,
        featureId: feature.id,
        path: `${FEATURES_ROOT}/${feature.id}/tasks/${task.id}.yaml`,
        task,
      });
    });
  });

  return locations;
}

function findTaskLocationForPullRequest(pull: BoardPullRequest, locations: TaskLocation[]): TaskLocation | null {
  const byBranch = locations.find((location) => {
    const task = location.task;
    return task.branch === pull.headRef || task.pr?.url === pull.htmlUrl || task.workspace_pr?.url === pull.htmlUrl;
  });
  if (byBranch) return byBranch;

  let taskId = extractTaskIdFromBranch(pull.headRef);
  if (!taskId) {
    const textToScan = `${pull.title ?? ""} ${pull.body ?? ""}`;
    const match = textToScan.match(/(?:^|[^a-z0-9])(T\d+)(?:\.yaml)?(?:$|[^a-z0-9])/i);
    if (match) {
      taskId = normalizeTaskId(match[1]);
    }
  }

  if (!taskId) return null;

  const byId = locations.filter((location) => normalizeTaskId(location.task.id) === taskId);
  if (byId.length === 1) return byId[0];

  const normalizedBranch = pull.headRef.toLowerCase();
  const byFeature = byId.filter((location) => normalizedBranch.includes(location.featureId.toLowerCase()));

  return byFeature.length === 1 ? byFeature[0] : null;
}

function mergePullRequestTask(baseTask: ParsedTask, branchTask: ParsedTask, pull: BoardPullRequest): ParsedTask {
  return {
    ...baseTask,
    ...branchTask,
    branch: branchTask.branch ?? pull.headRef,
    workspace_pr: {
      ...branchTask.workspace_pr,
      url: pull.htmlUrl,
      status: pull.state,
    },
  };
}

function upsertPullRequestTask(features: ParsedFeature[], taskFile: PullRequestTaskFile, branchTask: ParsedTask, pull: BoardPullRequest): void {
  let feature = features.find((item) => item.id === taskFile.featureId);
  if (!feature) {
    feature = {
      id: taskFile.featureId,
      title: taskFile.featureId,
      featureStatus: "unknown",
      tasks: [],
    };
    features.push(feature);
  }

  const taskIndex = feature.tasks.findIndex((task) => normalizeTaskId(task.id) === normalizeTaskId(taskFile.taskId));
  const baseTask =
    taskIndex >= 0
      ? feature.tasks[taskIndex]
      : {
          id: taskFile.taskId,
          title: "",
          status: "unknown",
          dependsOn: [],
        };

  const mergedTask = mergePullRequestTask(baseTask, branchTask, pull);
  if (taskIndex >= 0) {
    feature.tasks[taskIndex] = mergedTask;
    return;
  }

  feature.tasks.push(mergedTask);
}

async function applyPullRequestFileTaskOverrides(client: BoardDataClient, features: ParsedFeature[], pulls: BoardPullRequest[]): Promise<ParsedFeature[]> {
  if (!client.listPullRequestFiles) return features;

  const nextFeatures = features.map((feature) => ({
    ...feature,
    tasks: [...feature.tasks],
  }));

  await Promise.all(
    pulls.map(async (pull) => {
      const files = await client.listPullRequestFiles!(pull.number);
      const taskFiles = files.map((file) => parsePullRequestTaskFile(file.filename)).filter((file): file is PullRequestTaskFile => file !== null);

      await Promise.all(
        taskFiles.map(async (taskFile) => {
          let raw: string;
          try {
            raw = await client.getFileContent(taskFile.path, {
              ref: pull.headRef,
            });
          } catch (err) {
            if (err instanceof GitHubNotFoundError) return;
            throw err;
          }

          const branchTask = parseTaskYaml(taskFile.taskId, raw);
          if (!branchTask) return;

          upsertPullRequestTask(nextFeatures, taskFile, branchTask, pull);
        }),
      );
    }),
  );

  return nextFeatures;
}

async function applyMappedPullRequestTaskOverrides(client: BoardDataClient, features: ParsedFeature[], pulls: BoardPullRequest[]): Promise<ParsedFeature[]> {
  const nextFeatures = features.map((feature) => ({
    ...feature,
    tasks: [...feature.tasks],
  }));
  const locations = buildTaskLocations(nextFeatures);

  await Promise.all(
    pulls.map(async (pull) => {
      const location = findTaskLocationForPullRequest(pull, locations);
      if (!location) return;

      let raw: string;
      try {
        raw = await client.getFileContent(location.path, {
          ref: pull.headRef,
        });
      } catch (err) {
        if (err instanceof GitHubNotFoundError) return;
        throw err;
      }

      const branchTask = parseTaskYaml(location.task.id, raw);
      if (!branchTask) return;

      nextFeatures[location.featureIndex].tasks[location.taskIndex] = mergePullRequestTask(location.task, branchTask, pull);
    }),
  );

  return nextFeatures;
}

export async function fetchBoardData(client: BoardDataClient): Promise<ParsedFeature[]> {
  let rootEntries: GitHubEntry[];
  try {
    rootEntries = await client.listDirectory(FEATURES_ROOT);
  } catch (err) {
    throw new BoardLoadFailure(mapClientError(err));
  }

  const featureDirs = rootEntries.filter((entry) => entry.type === "dir");

  let features: ParsedFeature[];
  try {
    features = await Promise.all(featureDirs.map((dir) => loadFeature(client, dir)));
  } catch (err) {
    if (err instanceof BoardLoadFailure) throw err;
    throw new BoardLoadFailure(mapClientError(err));
  }

  features.sort((a, b) => a.id.localeCompare(b.id));
  return features;
}

export async function fetchPullRequestTaskData(client: BoardDataClient): Promise<ParsedFeature[]> {
  if (!client.listOpenPullRequests) return [];

  let pulls: BoardPullRequest[];
  try {
    pulls = await client.listOpenPullRequests();
  } catch (err) {
    throw new BoardLoadFailure(mapClientError(err));
  }

  if (pulls.length === 0) return [];

  try {
    if (client.listPullRequestFiles) {
      const features = await applyPullRequestFileTaskOverrides(client, [], pulls);
      features.sort((a, b) => a.id.localeCompare(b.id));
      return features;
    }

    // Fallback if listPullRequestFiles is not supported
    const rootEntries = await client.listDirectory(FEATURES_ROOT);
    const featureDirs = rootEntries.filter((entry) => entry.type === "dir");
    const baseFeatures = await Promise.all(featureDirs.map((dir) => loadFeature(client, dir)));
    const features = await applyMappedPullRequestTaskOverrides(client, baseFeatures, pulls);

    features.sort((a, b) => a.id.localeCompare(b.id));
    return features;
  } catch (err) {
    if (err instanceof BoardLoadFailure) throw err;
    throw new BoardLoadFailure(mapClientError(err));
  }
}
