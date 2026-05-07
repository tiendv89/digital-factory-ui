import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";

export type TrackedStatus = "in_progress" | "ready" | "in_review";

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
  { status: "in_progress", label: "IN PROGRESS" },
  { status: "ready", label: "READY" },
  { status: "in_review", label: "IN REVIEW" },
];
