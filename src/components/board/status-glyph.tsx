"use client";

import { CheckCircle2, Circle, CircleCheck, CircleDashed, CircleDot, CircleMinus, CircleX } from "lucide-react";

import { lifecycleMeta, statusMeta } from "./board-meta";

function GlyphIcon({ status, size }: { status: string; size: number }) {
  const { color } = statusMeta(status);
  const props = { size, color, "aria-hidden": true } as const;
  switch (status) {
    case "done":
      return <CheckCircle2 {...props} />;
    case "review_passed":
      return <CircleCheck {...props} />;
    case "in_progress":
    case "ready":
      return <CircleDashed {...props} />;
    case "in_review":
    case "reviewing":
    case "review_incomplete":
      return <CircleDot {...props} />;
    case "blocked":
    case "change_requested":
      return <CircleX {...props} />;
    case "cancelled":
      return <CircleMinus {...props} />;
    default:
      return <Circle {...props} />;
  }
}

export function StatusGlyph({ status, size = 14 }: { status: string; size?: number }) {
  return (
    <span style={{ display: "inline-flex", flexShrink: 0 }} title={statusMeta(status).label}>
      <GlyphIcon status={status} size={size} />
    </span>
  );
}

const LIFECYCLE_ICON_MAP: Record<string, string> = {
  in_design: "todo",
  in_tdd: "in_progress",
  ready_for_implementation: "ready",
  in_implementation: "in_progress",
  in_handoff: "in_review",
  done: "done",
  blocked: "blocked",
  cancelled: "cancelled",
};

/** SVG icon for a feature lifecycle stage. */
export function LifecycleGlyph({ stage, size = 14 }: { stage: string; size?: number }) {
  const meta = lifecycleMeta(stage);
  const taskStatus = LIFECYCLE_ICON_MAP[stage] ?? "todo";
  return (
    <span style={{ display: "inline-flex", flexShrink: 0 }} title={meta.label}>
      <GlyphIcon status={taskStatus} size={size} />
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta(status);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2"
      style={{
        backgroundColor: meta.bg,
        color: meta.color,
        fontSize: 11,
        fontWeight: 500,
        lineHeight: "18px",
        height: 18,
        whiteSpace: "nowrap",
      }}
    >
      <GlyphIcon status={status} size={10} />
      {meta.label}
    </span>
  );
}
