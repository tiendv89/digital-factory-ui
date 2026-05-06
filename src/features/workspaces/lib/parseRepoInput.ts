export type ParsedRepo = { owner: string; repo: string };
export function parseRepoInput(input: string): ParsedRepo | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };
  const httpsMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] };
  const shortMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };
  return null;
}
