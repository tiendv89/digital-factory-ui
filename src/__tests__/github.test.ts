import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  GitHubClient,
  GitHubAccessError,
  GitHubNotFoundError,
  GitHubApiError,
} from "../services/github";

function makeResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("GitHubClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    // Mirror browser atob: returns a binary (latin-1) string where each char
    // is one decoded byte. UTF-8 decoding is the caller's responsibility.
    vi.stubGlobal("atob", (s: string) =>
      Buffer.from(s, "base64").toString("binary"),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("listDirectory", () => {
    it("returns array of entries on 200", async () => {
      fetchMock.mockResolvedValueOnce(
        makeResponse(200, [
          { name: "T1.yaml", path: "docs/features/test/tasks/T1.yaml", type: "file", sha: "abc" },
          { name: "T2.yaml", path: "docs/features/test/tasks/T2.yaml", type: "file", sha: "def" },
        ]),
      );
      const client = new GitHubClient({ owner: "owner", repo: "repo" });
      const entries = await client.listDirectory("docs/features/test/tasks");
      expect(entries).toHaveLength(2);
      expect(entries[0].name).toBe("T1.yaml");
      expect(entries[1].type).toBe("file");
    });

    it("sends Authorization header when PAT provided", async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(200, []));
      const client = new GitHubClient({ owner: "o", repo: "r", pat: "ghp_token" });
      await client.listDirectory("docs");
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer ghp_token");
    });

    it("does not send Authorization header without PAT", async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(200, []));
      const client = new GitHubClient({ owner: "o", repo: "r" });
      await client.listDirectory("docs");
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Authorization"]).toBeUndefined();
    });

    it("throws GitHubAccessError on 401", async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(401, {}));
      const client = new GitHubClient({ owner: "o", repo: "r" });
      await expect(client.listDirectory("path")).rejects.toThrow(GitHubAccessError);
    });

    it("throws GitHubAccessError on 403", async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(403, {}));
      const client = new GitHubClient({ owner: "o", repo: "r" });
      await expect(client.listDirectory("path")).rejects.toThrow(GitHubAccessError);
    });

    it("throws GitHubNotFoundError on 404", async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(404, {}));
      const client = new GitHubClient({ owner: "o", repo: "r" });
      await expect(client.listDirectory("path")).rejects.toThrow(GitHubNotFoundError);
    });

    it("throws GitHubApiError on 500", async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(500, {}));
      const client = new GitHubClient({ owner: "o", repo: "r" });
      await expect(client.listDirectory("path")).rejects.toThrow(GitHubApiError);
    });

    it("throws GitHubApiError with correct status code", async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(422, {}));
      const client = new GitHubClient({ owner: "o", repo: "r" });
      let err: unknown;
      try {
        await client.listDirectory("path");
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(GitHubApiError);
      expect((err as GitHubApiError).status).toBe(422);
    });

    it("builds correct URL", async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(200, []));
      const client = new GitHubClient({ owner: "myorg", repo: "myrepo" });
      await client.listDirectory("docs/features");
      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://api.github.com/repos/myorg/myrepo/contents/docs/features");
    });

    it("adds ref query when reading from a branch", async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(200, []));
      const client = new GitHubClient({ owner: "myorg", repo: "myrepo" });
      await client.listDirectory("docs/features", { ref: "feature/dashboard-T4" });
      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "https://api.github.com/repos/myorg/myrepo/contents/docs/features?ref=feature%2Fdashboard-T4",
      );
    });
  });

  describe("getFileContent", () => {
    it("returns decoded base64 content", async () => {
      const encoded = Buffer.from("hello: world\n", "utf-8").toString("base64");
      fetchMock.mockResolvedValueOnce(
        makeResponse(200, { content: encoded, encoding: "base64" }),
      );
      const client = new GitHubClient({ owner: "o", repo: "r" });
      const content = await client.getFileContent("some/file.yaml");
      expect(content).toBe("hello: world\n");
    });

    it("decodes multi-byte UTF-8 content (en-dash, em-dash, smart quotes)", async () => {
      const text = "note: >-\n  Resolved Q1\u2013Q8 with decisions D1\u2014D10. \u201cDone\u201d.\n";
      const encoded = Buffer.from(text, "utf-8").toString("base64");
      fetchMock.mockResolvedValueOnce(
        makeResponse(200, { content: encoded, encoding: "base64" }),
      );
      const client = new GitHubClient({ owner: "o", repo: "r" });
      const content = await client.getFileContent("status.yaml");
      expect(content).toBe(text);
    });

    it("strips whitespace from base64 before decoding", async () => {
      const encoded = Buffer.from("key: value\n", "utf-8")
        .toString("base64")
        .replace(/(.{10})/g, "$1\n"); // add newlines every 10 chars like GitHub does
      fetchMock.mockResolvedValueOnce(
        makeResponse(200, { content: encoded, encoding: "base64" }),
      );
      const client = new GitHubClient({ owner: "o", repo: "r" });
      const content = await client.getFileContent("some/file.yaml");
      expect(content).toBe("key: value\n");
    });

    it("throws GitHubAccessError on 401", async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(401, {}));
      const client = new GitHubClient({ owner: "o", repo: "r" });
      await expect(client.getFileContent("path")).rejects.toThrow(GitHubAccessError);
    });

    it("throws GitHubNotFoundError on 404", async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(404, {}));
      const client = new GitHubClient({ owner: "o", repo: "r" });
      await expect(client.getFileContent("path")).rejects.toThrow(GitHubNotFoundError);
    });

    it("adds ref query when reading a task YAML from a PR branch", async () => {
      const encoded = Buffer.from("status: in_review\n", "utf-8").toString("base64");
      fetchMock.mockResolvedValueOnce(
        makeResponse(200, { content: encoded, encoding: "base64" }),
      );
      const client = new GitHubClient({ owner: "owner", repo: "repo" });

      await client.getFileContent("docs/features/dashboard/tasks/T4.yaml", {
        ref: "feature/dashboard-T4",
      });

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "https://api.github.com/repos/owner/repo/contents/docs/features/dashboard/tasks/T4.yaml?ref=feature%2Fdashboard-T4",
      );
    });
  });

  describe("listOpenPullRequests", () => {
    it("requests open pulls and returns normalized branch metadata", async () => {
      fetchMock.mockResolvedValueOnce(
        makeResponse(200, [
          {
            number: 4,
            state: "open",
            html_url: "https://github.com/owner/repo/pull/4",
            head: {
              ref: "feature/dashboard-T4",
              sha: "abc123",
            },
          },
        ]),
      );
      const client = new GitHubClient({ owner: "owner", repo: "repo" });

      const pulls = await client.listOpenPullRequests();

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "https://api.github.com/repos/owner/repo/pulls?state=open&per_page=100",
      );
      expect(pulls).toEqual([
        {
          number: 4,
          state: "open",
          htmlUrl: "https://github.com/owner/repo/pull/4",
          headRef: "feature/dashboard-T4",
          headSha: "abc123",
        },
      ]);
    });

    it("continues reading open pull request pages until the final partial page", async () => {
      fetchMock
        .mockResolvedValueOnce(
          makeResponse(
            200,
            Array.from({ length: 100 }, (_, index) => ({
              number: index + 1,
              state: "open",
              html_url: `https://github.com/owner/repo/pull/${index + 1}`,
              head: {
                ref: `feature/dashboard-T${index + 1}`,
                sha: `sha-${index + 1}`,
              },
            })),
          ),
        )
        .mockResolvedValueOnce(
          makeResponse(200, [
            {
              number: 101,
              state: "open",
              html_url: "https://github.com/owner/repo/pull/101",
              head: {
                ref: "feature/dashboard-T101",
                sha: "sha-101",
              },
            },
          ]),
        );
      const client = new GitHubClient({ owner: "owner", repo: "repo" });

      const pulls = await client.listOpenPullRequests();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect((fetchMock.mock.calls[0] as [string, RequestInit])[0]).toBe(
        "https://api.github.com/repos/owner/repo/pulls?state=open&per_page=100",
      );
      expect((fetchMock.mock.calls[1] as [string, RequestInit])[0]).toBe(
        "https://api.github.com/repos/owner/repo/pulls?state=open&per_page=100&page=2",
      );
      expect(pulls).toHaveLength(101);
      expect(pulls[100]).toMatchObject({
        number: 101,
        headRef: "feature/dashboard-T101",
      });
    });
  });

  describe("listPullRequestFiles", () => {
    it("requests files for a pull request and returns normalized filenames", async () => {
      fetchMock.mockResolvedValueOnce(
        makeResponse(200, [
          {
            filename: "docs/features/dashboard/tasks/T5.yaml",
            status: "modified",
            sha: "abc123",
          },
        ]),
      );
      const client = new GitHubClient({ owner: "owner", repo: "repo" });

      const files = await client.listPullRequestFiles(5);

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "https://api.github.com/repos/owner/repo/pulls/5/files?per_page=100",
      );
      expect(files).toEqual([
        {
          filename: "docs/features/dashboard/tasks/T5.yaml",
          status: "modified",
          sha: "abc123",
        },
      ]);
    });

    it("continues reading pull request file pages until the final partial page", async () => {
      fetchMock
        .mockResolvedValueOnce(
          makeResponse(
            200,
            Array.from({ length: 100 }, (_, index) => ({
              filename: `docs/features/dashboard/tasks/T${index + 1}.yaml`,
              status: "modified",
              sha: `sha-${index + 1}`,
            })),
          ),
        )
        .mockResolvedValueOnce(
          makeResponse(200, [
            {
              filename: "docs/features/dashboard/tasks/T101.yaml",
              status: "added",
              sha: "sha-101",
            },
          ]),
        );
      const client = new GitHubClient({ owner: "owner", repo: "repo" });

      const files = await client.listPullRequestFiles(5);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect((fetchMock.mock.calls[0] as [string, RequestInit])[0]).toBe(
        "https://api.github.com/repos/owner/repo/pulls/5/files?per_page=100",
      );
      expect((fetchMock.mock.calls[1] as [string, RequestInit])[0]).toBe(
        "https://api.github.com/repos/owner/repo/pulls/5/files?per_page=100&page=2",
      );
      expect(files).toHaveLength(101);
      expect(files[100]).toMatchObject({
        filename: "docs/features/dashboard/tasks/T101.yaml",
        status: "added",
      });
    });
  });
});
