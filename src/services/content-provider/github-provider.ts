/**
 * GitHub Content Provider
 *
 * Handles GitHub blob URLs and converts them to raw.githubusercontent.com
 * URLs to fetch the actual file content.
 *
 * Supports:
 *   - https://github.com/{owner}/{repo}/blob/{ref}/{path}
 *   - https://raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}
 *
 * Optional: Set GITHUB_TOKEN env var for private repos.
 */

import type { ContentProvider } from "./content-provider";

const GITHUB_BLOB_RE =
  /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/;

const RAW_GITHUB_RE =
  /^https?:\/\/raw\.githubusercontent\.com\//;

function toRawUrl(url: string): string | null {
  // Already a raw URL — use as-is
  if (RAW_GITHUB_RE.test(url)) {
    return url;
  }

  // Convert blob URL → raw URL
  const match = url.match(GITHUB_BLOB_RE);
  if (match) {
    const [, owner, repo, ref, path] = match;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
  }

  return null;
}

export class GitHubContentProvider implements ContentProvider {
  readonly name = "github";

  private token: string | undefined;

  constructor(token?: string) {
    this.token = token;
  }

  canHandle(url: string): boolean {
    return toRawUrl(url) !== null;
  }

  async fetchContent(url: string): Promise<string> {
    const rawUrl = toRawUrl(url);
    if (!rawUrl) {
      throw new Error(`GitHubContentProvider: unsupported URL: ${url}`);
    }

    const headers: Record<string, string> = {
      Accept: "text/plain",
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const res = await fetch(rawUrl, { headers });

    if (!res.ok) {
      throw new Error(
        `GitHubContentProvider: failed to fetch ${rawUrl} — ${res.status} ${res.statusText}`,
      );
    }

    return res.text();
  }
}
