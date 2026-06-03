import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";
import { clientStatusLabel } from "@/features/board/lib/status";

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
  { status: "blocked", label: clientStatusLabel("blocked").toUpperCase() },
  { status: "in_progress", label: clientStatusLabel("in_progress").toUpperCase() },
  { status: "reviewing", label: clientStatusLabel("reviewing").toUpperCase() },
  { status: "in_review", label: clientStatusLabel("in_review").toUpperCase() },
  { status: "ready", label: clientStatusLabel("ready").toUpperCase() },
];
