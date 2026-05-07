import type { PanelSelection } from "../components/TaskTrackingPanel/TaskTrackingPanel.types";

const STORAGE_KEY = "dashboard:board-panel-selection";
const PANEL_SELECTIONS = new Set<PanelSelection>([
  "kanban_board",
  "in_review",
  "in_progress",
  "ready",
]);

function isPanelSelection(value: unknown): value is PanelSelection {
  return (
    typeof value === "string" && PANEL_SELECTIONS.has(value as PanelSelection)
  );
}

export function getStoredPanelSelection(): PanelSelection | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isPanelSelection(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function savePanelSelection(selection: PanelSelection): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, selection);
  } catch {
    // Ignore storage failures so the board remains usable in restricted browsers.
  }
}
