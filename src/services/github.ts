export class GitHubAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubAccessError";
  }
}

export class GitHubNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubNotFoundError";
  }
}

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export type GitHubEntry = {
  name: string;
  path: string;
  type: "file" | "dir" | string;
  sha: string;
};

export type GitHubPullRequest = {
  number: number;
  state: string;
  htmlUrl: string;
  headRef: string;
  headSha?: string;
  title?: string;
  body?: string;
};

export type GitHubPullRequestFile = {
  filename: string;
  status: string;
  sha?: string;
};

type GitHubFileResponse = {
  content: string;
  encoding: string;
};

type GitHubPullRequestResponse = {
  number: number;
  state: string;
  html_url: string;
  title?: string;
  body?: string;
  head?: {
    ref?: string;
    sha?: string;
  };
};

type GitHubPullRequestFileResponse = {
  filename: string;
  status: string;
  sha?: string;
};

type RefOptions = {
  ref?: string;
};

import axios from "axios";

export class GitHubClient {
  private readonly owner: string;
  private readonly repo: string;
  private readonly pat?: string;

  constructor(opts: { owner: string; repo: string; pat?: string }) {
    this.owner = opts.owner;
    this.repo = opts.repo;
    this.pat = opts.pat;
  }

  private axiosHeaders(): Record<string, string> {
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (this.pat) headers["Authorization"] = `Bearer ${this.pat}`;
    return headers;
  }

  private async request<T>(url: string): Promise<T> {
    try {
      const { data } = await axios.get<T>(url, { headers: this.axiosHeaders() });
      return data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401 || status === 403) throw new GitHubAccessError("Access denied. Check your PAT or repository visibility.");
        if (status === 404) throw new GitHubNotFoundError("No workflow data found in this repository.");
        throw new GitHubApiError(`GitHub API error. Try again.`, status ?? 0);
      }
      throw err;
    }
  }

  private async requestPaginated<T>(url: URL): Promise<T[]> {
    const allItems: T[] = [];
    let page = 1;

    while (true) {
      if (page > 1) {
        url.searchParams.set("page", String(page));
      }

      const items = await this.request<T[]>(url.toString());
      allItems.push(...items);

      if (items.length < 100) {
        return allItems;
      }
      page += 1;
    }
  }

  private contentsUrl(path: string, options: RefOptions = {}): string {
    const url = new URL(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`);
    if (options.ref) url.searchParams.set("ref", options.ref);
    return url.toString();
  }

  async listDirectory(path: string, options: RefOptions = {}): Promise<GitHubEntry[]> {
    const data = await this.request<GitHubEntry[]>(this.contentsUrl(path, options));
    return data.map(({ name, path: entryPath, type, sha }) => ({
      name,
      path: entryPath,
      type,
      sha,
    }));
  }

  async getFileContent(path: string, options: RefOptions = {}): Promise<string> {
    const data = await this.request<GitHubFileResponse>(this.contentsUrl(path, options));
    const binary = atob(data.content.replace(/\s/g, ""));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  }

  async listOpenPullRequests(): Promise<GitHubPullRequest[]> {
    const url = new URL(`https://api.github.com/repos/${this.owner}/${this.repo}/pulls`);
    url.searchParams.set("state", "open");
    url.searchParams.set("per_page", "100");

    const data = await this.requestPaginated<GitHubPullRequestResponse>(url);

    return data
      .filter((pull) => typeof pull.head?.ref === "string")
      .map((pull) => ({
        number: pull.number,
        state: pull.state,
        htmlUrl: pull.html_url,
        headRef: pull.head!.ref!,
        title: pull.title,
        body: pull.body,
        ...(typeof pull.head?.sha === "string" ? { headSha: pull.head.sha } : {}),
      }));
  }

  async listPullRequestFiles(number: number): Promise<GitHubPullRequestFile[]> {
    const url = new URL(`https://api.github.com/repos/${this.owner}/${this.repo}/pulls/${number}/files`);
    url.searchParams.set("per_page", "100");

    const data = await this.requestPaginated<GitHubPullRequestFileResponse>(url);

    return data.map((file) => ({
      filename: file.filename,
      status: file.status,
      ...(typeof file.sha === "string" ? { sha: file.sha } : {}),
    }));
  }
}
