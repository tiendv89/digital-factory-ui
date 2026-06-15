import type { ParsedFeature, ParsedTask } from "@/services/yaml-parser";
import { FEATURE_MODE_STATUSES } from "@/utils/board/status";

type BriefStatus = "todo" | "ready" | "in_progress" | "in_review" | "reviewing" | "review_passed" | "change_requested" | "review_incomplete" | "blocked" | "done" | "cancelled";

const STATUS_META: Record<BriefStatus, { label: string; color: string; bg: string; glyph: string }> = {
  todo: { label: "Todo", color: "oklch(0.65 0.01 270)", bg: "oklch(0.65 0.01 270 / 0.15)", glyph: "○" },
  ready: { label: "Ready", color: "oklch(0.72 0.13 230)", bg: "oklch(0.72 0.13 230 / 0.15)", glyph: "◐" },
  in_progress: { label: "In Progress", color: "oklch(0.74 0.15 250)", bg: "oklch(0.74 0.15 250 / 0.15)", glyph: "◑" },
  in_review: { label: "In Review", color: "oklch(0.74 0.14 90)", bg: "oklch(0.74 0.14 90 / 0.15)", glyph: "◉" },
  reviewing: { label: "Reviewing", color: "oklch(0.74 0.14 75)", bg: "oklch(0.74 0.14 75 / 0.15)", glyph: "◉" },
  review_passed: { label: "Review Passed", color: "oklch(0.70 0.13 150)", bg: "oklch(0.70 0.13 150 / 0.15)", glyph: "✓" },
  change_requested: { label: "Changes Requested", color: "oklch(0.70 0.16 30)", bg: "oklch(0.70 0.16 30 / 0.15)", glyph: "↺" },
  review_incomplete: { label: "In Review", color: "oklch(0.74 0.14 90)", bg: "oklch(0.74 0.14 90 / 0.15)", glyph: "◉" },
  blocked: { label: "Blocked", color: "oklch(0.65 0.20 25)", bg: "oklch(0.65 0.20 25 / 0.15)", glyph: "⊗" },
  done: { label: "Done", color: "oklch(0.68 0.15 150)", bg: "oklch(0.68 0.15 150 / 0.15)", glyph: "●" },
  cancelled: { label: "Cancelled", color: "oklch(0.55 0.02 270)", bg: "oklch(0.55 0.02 270 / 0.15)", glyph: "⊘" },
};

export function statusMeta(status: string) {
  return STATUS_META[status as BriefStatus] ?? STATUS_META.todo;
}

export const FEATURE_LIFECYCLE_META: Record<string, { label: string; color: string; bg: string }> = {
  in_design: { label: "In Design", color: "oklch(0.72 0.13 230)", bg: "oklch(0.72 0.13 230 / 0.15)" },
  in_tdd: { label: "In TDD", color: "oklch(0.74 0.15 250)", bg: "oklch(0.74 0.15 250 / 0.15)" },
  ready_for_implementation: { label: "Ready for Impl.", color: "oklch(0.72 0.13 230)", bg: "oklch(0.72 0.13 230 / 0.15)" },
  in_implementation: { label: "In Implementation", color: "oklch(0.74 0.15 250)", bg: "oklch(0.74 0.15 250 / 0.15)" },
  in_handoff: { label: "In Handoff", color: "oklch(0.74 0.14 90)", bg: "oklch(0.74 0.14 90 / 0.15)" },
  done: { label: "Done", color: "oklch(0.68 0.15 150)", bg: "oklch(0.68 0.15 150 / 0.15)" },
  blocked: { label: "Blocked", color: "oklch(0.65 0.20 25)", bg: "oklch(0.65 0.20 25 / 0.15)" },
  cancelled: { label: "Cancelled", color: "oklch(0.55 0.02 270)", bg: "oklch(0.55 0.02 270 / 0.15)" },
};

export function lifecycleMeta(status: string) {
  return FEATURE_LIFECYCLE_META[status] ?? FEATURE_LIFECYCLE_META.in_design;
}

export const FEATURE_COLUMNS: { id: string; label: string; color: string }[] = FEATURE_MODE_STATUSES.map((id) => ({
  id,
  label: lifecycleMeta(id).label.toUpperCase(),
  color: lifecycleMeta(id).color,
}));

const FEATURE_COLORS = ["oklch(0.62 0.19 280)", "oklch(0.70 0.16 30)", "oklch(0.74 0.14 90)", "oklch(0.72 0.13 230)", "oklch(0.70 0.13 150)", "oklch(0.74 0.15 250)"];

function featureColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return FEATURE_COLORS[hash % FEATURE_COLORS.length];
}

export type BoardAssignee = {
  name: string;
  type: "human" | "agent";
  working: boolean;
} | null;

const DONE_LIKE = new Set(["done", "cancelled", "review_passed"]);

export function deriveBoardAssignee(task: ParsedTask): BoardAssignee {
  const ex = task.execution;
  if (!ex?.actor_type) return null;
  const isAgent = ex.actor_type === "agent";
  const name = ex.last_updated_by ?? (isAgent ? "agent" : "user");
  const working = isAgent && (task.status === "in_progress" || task.status === "reviewing");
  return { name, type: isAgent ? "agent" : "human", working };
}

export type BoardFeatureRow = {
  feature: ParsedFeature;
  name: string;
  color: string;
  done: number;
  total: number;
  pct: number;
};

export function toFeatureRows(features: ParsedFeature[]): BoardFeatureRow[] {
  return features.map((feature) => {
    const total = feature.tasks.length;
    const done = feature.tasks.filter((t) => DONE_LIKE.has(t.status)).length;
    return {
      feature,
      name: feature.title || feature.id,
      color: featureColor(feature.id),
      done,
      total,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });
}
