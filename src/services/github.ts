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

type GitHubFileResponse = {
  content: string;
  encoding: string;
};

export class GitHubClient {
  private readonly owner: string;
  private readonly repo: string;
  private readonly pat?: string;

  constructor(opts: { owner: string; repo: string; pat?: string }) {
    this.owner = opts.owner;
    this.repo = opts.repo;
    this.pat = opts.pat;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
    };
    if (this.pat) {
      headers["Authorization"] = `Bearer ${this.pat}`;
    }
    return headers;
  }

  private async request<T>(path: string): Promise<T> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`;
    const res = await fetch(url, { headers: this.headers() });

    if (res.status === 401 || res.status === 403) {
      throw new GitHubAccessError(
        "Access denied. Check your PAT or repository visibility.",
      );
    }
    if (res.status === 404) {
      throw new GitHubNotFoundError(
        "No workflow data found in this repository.",
      );
    }
    if (!res.ok) {
      throw new GitHubApiError(`GitHub API error. Try again.`, res.status);
    }

    return res.json() as Promise<T>;
  }

  async listDirectory(path: string): Promise<GitHubEntry[]> {
    const data = await this.request<GitHubEntry[]>(path);
    return data.map(({ name, path: entryPath, type, sha }) => ({
      name,
      path: entryPath,
      type,
      sha,
    }));
  }

  async getFileContent(path: string): Promise<string> {
    const data = await this.request<GitHubFileResponse>(path);
    return atob(data.content.replace(/\s/g, ""));
  }
}
