import type { LocalWorkspaceSummary } from "@/services/workflow-backend";

const SUMMARIES_KEY = "dashboard:workspace-summaries";
const SELECTED_ID_KEY = "dashboard:workspace-selected-id";

export function getLocalWorkspaceSummaries(): LocalWorkspaceSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SUMMARIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalWorkspaceSummary[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalWorkspaceSummary(summary: LocalWorkspaceSummary): void {
  if (typeof window === "undefined") return;
  const summaries = getLocalWorkspaceSummaries();
  const idx = summaries.findIndex((s) => s.workspaceId === summary.workspaceId);
  if (idx >= 0) {
    summaries[idx] = summary;
  } else {
    summaries.push(summary);
  }
  localStorage.setItem(SUMMARIES_KEY, JSON.stringify(summaries));
}

export function removeLocalWorkspaceSummary(workspaceId: string): void {
  if (typeof window === "undefined") return;
  const summaries = getLocalWorkspaceSummaries().filter(
    (s) => s.workspaceId !== workspaceId,
  );
  localStorage.setItem(SUMMARIES_KEY, JSON.stringify(summaries));
}

export function getSelectedWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SELECTED_ID_KEY) ?? null;
}

export function setSelectedWorkspaceId(workspaceId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SELECTED_ID_KEY, workspaceId);
}

export function clearSelectedWorkspaceId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SELECTED_ID_KEY);
}

export function resolveBootstrapWorkspaceId(
  summaries: LocalWorkspaceSummary[],
  storedId: string | null,
): string | null {
  if (storedId) return storedId;
  if (summaries.length === 0) return null;
  return (
    [...summaries].sort(
      (a, b) =>
        new Date(b.last_opened_at).getTime() -
        new Date(a.last_opened_at).getTime(),
    )[0]?.workspaceId ?? null
  );
}
