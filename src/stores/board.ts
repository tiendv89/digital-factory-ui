import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { FEATURE_MODE_STATUSES, type FeatureStatus, TASK_MODE_STATUSES, type TaskStatus } from "@/utils/board/status";

export type BoardMode = "task" | "feature";
export type ViewMode = "kanban" | "list";

const DEFAULT_COLLAPSED_GROUPS = ["done", "cancelled"];

type BoardStoreState = {
  boardMode: BoardMode;
  viewMode: ViewMode;
  taskStatusFilter: TaskStatus[];
  featureStatusFilter: FeatureStatus[];
  /** Feature IDs with collapsed task rows in list view */
  collapsedFeatures: string[];
  /** Feature lifecycle group statuses collapsed in list view */
  collapsedGroups: string[];
  /** Feature workbench sidebar sections that are collapsed */
  collapsedWorkbenchSections: string[];
  /** Last task the user navigated to (task_name), for nav-rail smart routing */
  lastViewedTaskId: string | null;

  setBoardMode: (mode: BoardMode) => void;
  setViewMode: (mode: ViewMode) => void;
  setTaskStatusFilter: (statuses: TaskStatus[]) => void;
  setFeatureStatusFilter: (statuses: FeatureStatus[]) => void;
  toggleFeatureCollapsed: (featureId: string) => void;
  toggleGroupCollapsed: (status: string) => void;
  toggleWorkbenchSection: (section: string) => void;
  setLastViewedTaskId: (taskId: string) => void;
  clearBoardPrefs: () => void;
};

const DEFAULT_TASK_FILTER: TaskStatus[] = TASK_MODE_STATUSES.filter((s) => s !== "done");
const DEFAULT_FEATURE_FILTER: FeatureStatus[] = FEATURE_MODE_STATUSES.filter((s) => s !== "done");

export const useBoardStore = create<BoardStoreState>()(
  persist(
    (set) => ({
      boardMode: "task",
      viewMode: "kanban",
      taskStatusFilter: DEFAULT_TASK_FILTER,
      featureStatusFilter: DEFAULT_FEATURE_FILTER,
      collapsedFeatures: [],
      collapsedGroups: DEFAULT_COLLAPSED_GROUPS,
      collapsedWorkbenchSections: [],
      lastViewedTaskId: null,

      setBoardMode: (mode) => set({ boardMode: mode }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setTaskStatusFilter: (statuses) => set({ taskStatusFilter: statuses }),
      setFeatureStatusFilter: (statuses) => set({ featureStatusFilter: statuses }),
      toggleFeatureCollapsed: (featureId) =>
        set((state) => ({
          collapsedFeatures: state.collapsedFeatures.includes(featureId) ? state.collapsedFeatures.filter((id) => id !== featureId) : [...state.collapsedFeatures, featureId],
        })),
      toggleGroupCollapsed: (status) =>
        set((state) => ({
          collapsedGroups: state.collapsedGroups.includes(status) ? state.collapsedGroups.filter((s) => s !== status) : [...state.collapsedGroups, status],
        })),
      toggleWorkbenchSection: (section) =>
        set((state) => ({
          collapsedWorkbenchSections: state.collapsedWorkbenchSections.includes(section)
            ? state.collapsedWorkbenchSections.filter((s) => s !== section)
            : [...state.collapsedWorkbenchSections, section],
        })),
      setLastViewedTaskId: (taskId) => set({ lastViewedTaskId: taskId }),
      clearBoardPrefs: () =>
        set({
          boardMode: "task",
          taskStatusFilter: DEFAULT_TASK_FILTER,
          featureStatusFilter: DEFAULT_FEATURE_FILTER,
        }),
    }),
    {
      name: "dashboard:board-prefs",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
