import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";

export type TrackedStatus =
  | "blocked"
  | "in_progress"
  | "reviewing"
  | "in_review"
  | "ready";

export type PanelSelection = "kanban_board" | TrackedStatus;

export type TrackedTaskItem = {
  task: ParsedTask;
  feature: ParsedFeature;
};

export type TrackedSection = {
  status: TrackedStatus;
  label: string;
  items: TrackedTaskItem[];
};

export const TRACKED_SECTIONS: ReadonlyArray<{
  status: TrackedStatus;
  label: string;
}> = [
  { status: "blocked", label: "BLOCKED" },
  { status: "in_progress", label: "IN PROGRESS" },
  { status: "reviewing", label: "IN REVIEWING" },
  { status: "in_review", label: "IN REVIEW" },
  { status: "ready", label: "READY" },
];
