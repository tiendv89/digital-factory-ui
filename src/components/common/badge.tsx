"use client";

import React from "react";

import { cn } from "./cn";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger" | "purple";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Render a leading status dot. */
  dot?: boolean;
  /** Drive color from an arbitrary hex (status colors). Overrides `tone`. */
  color?: string;
}

const TONE: Record<BadgeTone, string> = {
  neutral: "border-border bg-chip-bg text-text-secondary",
  primary: "border-primary/40 bg-primary/15 text-primary",
  success: "border-success/40 bg-success-bg text-success",
  warning: "border-warning/40 bg-warning-bg text-warning",
  danger: "border-danger/40 bg-danger-bg text-danger",
  purple: "border-purple/40 bg-purple-bg text-purple",
};

/** Small pill — role/plan/status chips. 11px text, rounded. */
export function Badge({ tone = "neutral", dot, color, className, children, style, ...props }: BadgeProps) {
  const colorStyle = color ? { color, background: `${color}1f`, borderColor: `${color}55`, ...style } : style;

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none", !color && TONE[tone], className)} style={colorStyle} {...props}>
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color ?? "currentColor" }} />}
      {children}
    </span>
  );
}
