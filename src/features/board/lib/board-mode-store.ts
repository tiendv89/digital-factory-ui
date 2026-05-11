export type BoardMode = "task" | "feature";

const STORAGE_KEY = "dashboard:board-mode";

const VALID_MODES: Set<string> = new Set<BoardMode>(["task", "feature"]);

function isValidBoardMode(value: unknown): value is BoardMode {
  return typeof value === "string" && VALID_MODES.has(value);
}

export function getStoredBoardMode(): BoardMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidBoardMode(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveBoardMode(mode: BoardMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mode));
  } catch {
    // Ignore storage failures.
  }
}
