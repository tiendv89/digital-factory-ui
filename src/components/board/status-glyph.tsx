"use client";

import { lifecycleMeta, statusMeta } from "./board-meta";

type GP = { size: number; color: string };

function Todo({ size, color }: GP) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.5" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function InProgress({ size, color }: GP) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="6.5" stroke={color} strokeWidth="1.5" fill="none" />
      {/* left half filled */}
      <path d="M8 1.5 A6.5 6.5 0 0 0 8 14.5 Z" fill={color} />
    </svg>
  );
}

function InReview({ size, color }: GP) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.5" stroke={color} strokeWidth="1.5" />
      <circle cx="8" cy="8" r="2.5" fill={color} />
    </svg>
  );
}

function Blocked({ size, color }: GP) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.5" stroke={color} strokeWidth="1.5" />
      <path d="M5.5 5.5 L10.5 10.5 M10.5 5.5 L5.5 10.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Done({ size, color }: GP) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="7.5" fill={color} />
    </svg>
  );
}

function ReviewPassed({ size, color }: GP) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="7.5" fill={color} />
      <path d="M5 8.5 L7 10.5 L11 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Cancelled({ size, color }: GP) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.5" stroke={color} strokeWidth="1.5" />
      <line x1="4.5" y1="8" x2="11.5" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GlyphIcon({ status, size }: { status: string; size: number }) {
  const { color } = statusMeta(status);
  const p = { size, color };
  switch (status) {
    case "done":
      return <Done {...p} />;
    case "review_passed":
      return <ReviewPassed {...p} />;
    case "in_progress":
    case "ready":
      return <InProgress {...p} />;
    case "in_review":
    case "reviewing":
    case "review_incomplete":
      return <InReview {...p} />;
    case "blocked":
    case "change_requested":
      return <Blocked {...p} />;
    case "cancelled":
      return <Cancelled {...p} />;
    default:
      return <Todo {...p} />;
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
