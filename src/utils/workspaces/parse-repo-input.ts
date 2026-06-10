export type ParsedRepo = {
  owner: string;
  repo: string;
};

/**
 * Parses a GitHub repository identifier from multiple formats:
 *   owner/repo
 *   https://github.com/owner/repo
 *   git@github.com:owner/repo.git
 */
export function parseRepoInput(input: string): ParsedRepo | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // SSH format: git@github.com:owner/repo.git
  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  // HTTPS URL: https://github.com/owner/repo
  const httpsMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  // Short form: owner/repo (must contain exactly one slash, no extra path segments)
  const shortMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2] };
  }

  return null;
}
