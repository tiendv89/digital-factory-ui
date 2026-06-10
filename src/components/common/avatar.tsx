"use client";

import React from "react";

import { cn } from "./cn";

interface AvatarProps {
  /** Name used to derive initials when no children are given. */
  name?: string;
  /** Background color (org/workspace icon color). */
  color?: string;
  shape?: "square" | "round";
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}

const SIZE: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

function initials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, color, shape = "round", size = "md", className, children }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center font-semibold text-white",
        shape === "square" ? "rounded-[8px]" : "rounded-full",
        SIZE[size],
        !color && "bg-surface-secondary text-text-secondary",
        className,
      )}
      style={color ? { background: color } : undefined}
    >
      {children ?? initials(name)}
    </div>
  );
}
