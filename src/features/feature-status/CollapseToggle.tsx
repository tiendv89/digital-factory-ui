"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type CollapseToggleProps = {
  side: "left" | "right";
  collapsed: boolean;
  onToggle: () => void;
};

export function CollapseToggle({ side, collapsed, onToggle }: CollapseToggleProps) {
  const showLeft = side === "left" ? !collapsed : collapsed;
  const Icon = showLeft ? ChevronLeft : ChevronRight;

  return (
    <button
      data-collapse-toggle
      data-side={side}
      type="button"
      onClick={onToggle}
      className="flex w-3 shrink-0 cursor-pointer items-center justify-center bg-surface hover:bg-surface-subtle border-border text-text-muted transition-colors hover:text-text-secondary"
      aria-label={collapsed ? `Expand ${side} panel` : `Collapse ${side} panel`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
    </button>
  );
}
