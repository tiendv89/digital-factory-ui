export {
  BoardProvider,
  useBoardContext,
  KanbanBoard,
  type BoardContextValue,
  type BoardProviderProps,
  type SelectedTask,
} from "./components/KanbanBoard";
export { BoardHeader } from "./components/BoardHeader";
export { FeatureRow, SegmentBar } from "./components/FeatureRow";
export { TaskCard } from "./components/TaskCard";
export { useBoardData } from "./hooks/useBoardData";
export {
  fetchBoardData,
  BoardLoadFailure,
  mapClientError,
  type BoardDataClient,
} from "./data/load-board-data";
export type { BoardLoadError, ActiveFilters } from "./types";
export {
  STATUS_KEYS,
  STATUS_LABEL,
  STATUS_NEXT_ACTION,
  STATUS_TONE,
  normalizeStatus,
  type StatusKey,
} from "./lib/status";
export {
  filterFeatureTasks,
  bucketTasksByStatus,
  buildTaskSegments,
  computeProgress,
  matchesSearch,
  matchesStatusFilter,
  type TaskSegment,
  type FeatureProgress,
} from "./lib/filter";
