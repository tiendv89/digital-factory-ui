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
    vi.stubGlobal("atob", (s: string) => Buffer.from(s, "base64").toString("utf-8"));
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
  });
});
