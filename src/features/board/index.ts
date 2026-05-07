export {
  BoardProvider,
  useBoardContext,
  KanbanBoard,
  type BoardContextValue,
  type BoardProviderProps,
  type SelectedTask,
} from "./components/KanbanBoard";
export { BoardHeader } from "./components/BoardHeader";
export { FeatureRow } from "./components/FeatureRow";
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
  STATUS_COLUMNS,
  getStatusColor,
  getNextAction,
  getFeatureStatusColor,
  getFeatureStatusLabel,
  type TaskStatus,
  type StatusColumn,
} from "./lib/status";
