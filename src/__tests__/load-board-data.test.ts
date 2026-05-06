import { describe, it, expect, vi } from "vitest";
import {
  fetchBoardData,
  BoardLoadFailure,
  mapClientError,
  type BoardDataClient,
} from "../features/board/data/load-board-data";
import {
  GitHubAccessError,
  GitHubApiError,
  GitHubNotFoundError,
  type GitHubEntry,
} from "../services/github";

function makeClient(overrides: Partial<BoardDataClient> = {}): BoardDataClient {
  return {
    listDirectory: overrides.listDirectory ?? vi.fn().mockResolvedValue([]),
    getFileContent: overrides.getFileContent ?? vi.fn().mockResolvedValue(""),
  };
}

function dirEntry(name: string, path = `docs/features/${name}`): GitHubEntry {
  return { name, path, type: "dir", sha: "x" };
}

function fileEntry(
  name: string,
  parentPath = "docs/features/test/tasks",
): GitHubEntry {
  return { name, path: `${parentPath}/${name}`, type: "file", sha: "y" };
}

describe("mapClientError", () => {
  it("maps GitHubAccessError → access_denied", () => {
    const err = mapClientError(new GitHubAccessError("denied"));
    expect(err).toEqual({ kind: "access_denied", message: "denied" });
  });

  it("maps GitHubNotFoundError → not_found", () => {
    const err = mapClientError(new GitHubNotFoundError("missing"));
    expect(err).toEqual({ kind: "not_found", message: "missing" });
  });

  it("maps GitHubApiError → network_error", () => {
    const err = mapClientError(new GitHubApiError("server boom", 500));
    expect(err.kind).toBe("network_error");
    expect(err.message).toBe("server boom");
  });

  it("maps generic Error → network_error", () => {
    const err = mapClientError(new Error("offline"));
    expect(err.kind).toBe("network_error");
  });

  it("maps unknown thrown value → network_error with fallback message", () => {
    const err = mapClientError("nope");
    expect(err).toEqual({ kind: "network_error", message: "Unknown error" });
  });
});

describe("fetchBoardData — error mapping", () => {
  it("throws BoardLoadFailure(access_denied) when listing root is forbidden", async () => {
    const client = makeClient({
      listDirectory: vi.fn().mockRejectedValue(new GitHubAccessError("nope")),
    });
    await expect(fetchBoardData(client)).rejects.toMatchObject({
      error: { kind: "access_denied" },
    });
  });

  it("throws BoardLoadFailure(not_found) when docs/features is missing", async () => {
    const client = makeClient({
      listDirectory: vi.fn().mockRejectedValue(new GitHubNotFoundError("404")),
    });
    await expect(fetchBoardData(client)).rejects.toMatchObject({
      error: { kind: "not_found" },
    });
  });

  it("throws BoardLoadFailure(network_error) on generic API error", async () => {
    const client = makeClient({
      listDirectory: vi.fn().mockRejectedValue(new GitHubApiError("500", 500)),
    });
    await expect(fetchBoardData(client)).rejects.toMatchObject({
      error: { kind: "network_error" },
    });
  });

  it("propagates access_denied from feature loader", async () => {
    const list = vi.fn();
    list.mockResolvedValueOnce([dirEntry("alpha")]); // root
    list.mockRejectedValueOnce(new GitHubAccessError("hidden")); // tasks dir
    const get = vi
      .fn()
      .mockRejectedValueOnce(new GitHubAccessError("hidden"));
    const client = makeClient({ listDirectory: list, getFileContent: get });

    await expect(fetchBoardData(client)).rejects.toMatchObject({
      error: { kind: "access_denied" },
    });
  });
});

describe("fetchBoardData — success", () => {
  it("returns empty array when docs/features is empty", async () => {
    const client = makeClient({
      listDirectory: vi.fn().mockResolvedValue([]),
    });
    const features = await fetchBoardData(client);
    expect(features).toEqual([]);
  });

  it("ignores non-directory entries at the root", async () => {
    const list = vi.fn();
    list.mockResolvedValueOnce([
      { name: "README.md", path: "docs/features/README.md", type: "file", sha: "1" },
    ]);
    const client = makeClient({ listDirectory: list });
    const features = await fetchBoardData(client);
    expect(features).toEqual([]);
  });

  it("loads a feature with its status and tasks", async () => {
    const statusYaml = `
feature_id: alpha
title: Alpha Feature
feature_status: in_implementation
`;
    const taskYaml = `
id: T1
title: First task
status: ready
depends_on: []
`;

    const list = vi.fn();
    list.mockResolvedValueOnce([dirEntry("alpha")]);
    list.mockResolvedValueOnce([fileEntry("T1.yaml", "docs/features/alpha/tasks")]);

    const get = vi.fn();
    get.mockImplementation(async (p: string) => {
      if (p === "docs/features/alpha/status.yaml") return statusYaml;
      if (p === "docs/features/alpha/tasks/T1.yaml") return taskYaml;
      throw new GitHubNotFoundError(p);
    });

    const client = makeClient({ listDirectory: list, getFileContent: get });
    const features = await fetchBoardData(client);

    expect(features).toHaveLength(1);
    expect(features[0].id).toBe("alpha");
    expect(features[0].title).toBe("Alpha Feature");
    expect(features[0].featureStatus).toBe("in_implementation");
    expect(features[0].tasks).toHaveLength(1);
    expect(features[0].tasks[0].id).toBe("T1");
    expect(features[0].tasks[0].status).toBe("ready");
  });

  it("falls back to defaults when status.yaml is missing", async () => {
    const list = vi.fn();
    list.mockResolvedValueOnce([dirEntry("beta")]);
    list.mockResolvedValueOnce([]); // no tasks dir entries

    const get = vi.fn();
    get.mockRejectedValueOnce(new GitHubNotFoundError("status.yaml missing"));

    const client = makeClient({ listDirectory: list, getFileContent: get });
    const features = await fetchBoardData(client);

    expect(features).toHaveLength(1);
    expect(features[0].id).toBe("beta");
    expect(features[0].title).toBe("beta");
    expect(features[0].featureStatus).toBe("unknown");
    expect(features[0].tasks).toEqual([]);
  });

  it("skips malformed task YAMLs but keeps valid ones", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const list = vi.fn();
    list.mockResolvedValueOnce([dirEntry("gamma")]);
    list.mockResolvedValueOnce([
      fileEntry("T1.yaml", "docs/features/gamma/tasks"),
      fileEntry("T2.yaml", "docs/features/gamma/tasks"),
      fileEntry("notes.md", "docs/features/gamma/tasks"),
    ]);

    const get = vi.fn();
    get.mockImplementation(async (p: string) => {
      if (p === "docs/features/gamma/status.yaml") {
        return `feature_id: gamma\ntitle: Gamma\nfeature_status: in_design\n`;
      }
      if (p === "docs/features/gamma/tasks/T1.yaml") {
        return `id: T1\ntitle: ok\nstatus: todo\ndepends_on: []\n`;
      }
      if (p === "docs/features/gamma/tasks/T2.yaml") {
        return `\nid: T2\n  bad: [\n  yaml: {\n`;
      }
      throw new GitHubNotFoundError(p);
    });

    const client = makeClient({ listDirectory: list, getFileContent: get });
    const features = await fetchBoardData(client);

    expect(features).toHaveLength(1);
    expect(features[0].tasks.map((t) => t.id)).toEqual(["T1"]);
    expect(consoleWarn).toHaveBeenCalled();
    consoleWarn.mockRestore();
  });

  it("sorts features by id", async () => {
    const list = vi.fn();
    list.mockResolvedValueOnce([dirEntry("zeta"), dirEntry("alpha")]);
    list.mockResolvedValue([]);
    const get = vi
      .fn()
      .mockRejectedValue(new GitHubNotFoundError("no status"));
    const client = makeClient({ listDirectory: list, getFileContent: get });
    const features = await fetchBoardData(client);
    expect(features.map((f) => f.id)).toEqual(["alpha", "zeta"]);
  });

  it("wraps unknown thrown values inside the feature loader", async () => {
    const list = vi.fn();
    list.mockResolvedValueOnce([dirEntry("delta")]);
    list.mockRejectedValueOnce(new GitHubApiError("rate limited", 502));
    const get = vi
      .fn()
      .mockRejectedValueOnce(new GitHubApiError("rate limited", 502));
    const client = makeClient({ listDirectory: list, getFileContent: get });

    let caught: unknown;
    try {
      await fetchBoardData(client);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(BoardLoadFailure);
    expect((caught as BoardLoadFailure).error.kind).toBe("network_error");
  });
});
