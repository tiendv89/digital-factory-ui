import type { StoredWorkspace } from "@/types/workspace";

const STORAGE_KEY = "dashboard:workspace";

export function getWorkspace(): StoredWorkspace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredWorkspace;
  } catch {
    return null;
  }
}

export function saveWorkspace(w: StoredWorkspace): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
}

export function clearWorkspace(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
