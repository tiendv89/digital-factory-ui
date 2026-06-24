"use client";

import { ArrowRight } from "lucide-react";

import type { CtaSuggestion } from "./types";

const CATEGORY_COLORS: Record<string, string> = {
  Lifecycle: "bg-primary/10 text-primary",
  Clarify: "bg-blue-500/10 text-blue-400",
  Review: "bg-amber-500/10 text-amber-400",
  Edit: "bg-purple-500/10 text-purple-400",
  Action: "bg-green-500/10 text-green-400",
  GitNexus: "bg-cyan-500/10 text-cyan-400",
  RAG: "bg-indigo-500/10 text-indigo-400",
};

type CTACardProps = {
  suggestion: CtaSuggestion;
  active: boolean;
  onAction: (actionText: string) => void;
};

export function CTACard({ suggestion, active, onAction }: CTACardProps) {
  const categoryColor = CATEGORY_COLORS[suggestion.category] ?? "bg-surface-secondary text-text-muted";

  const handleClick = () => {
    if (active) onAction(suggestion.action_text);
  };

  return (
    <div
      data-cta-card
      data-active={active}
      className={`flex min-w-[180px] max-w-[240px] flex-col gap-2 rounded-lg border border-border bg-surface p-3 transition-opacity ${active ? "" : "pointer-events-none opacity-50"}`}
    >
      <div className="flex items-start gap-2">
        {suggestion.icon && (
          <span className="text-base leading-none" aria-hidden="true">
            {suggestion.icon}
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[12px] font-semibold leading-tight text-text-primary">{suggestion.title}</span>
          <span className={`self-start rounded px-1.5 py-px text-[10px] font-medium ${categoryColor}`}>{suggestion.category}</span>
        </div>
      </div>
      <p className="text-[11px] leading-relaxed text-text-secondary">{suggestion.description}</p>
      <button
        type="button"
        disabled={!active}
        onClick={handleClick}
        className={`mt-auto flex items-center gap-1 self-start rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
          active ? "bg-primary text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" : "bg-surface-secondary text-text-muted cursor-not-allowed"
        }`}
        aria-label={active ? `${suggestion.button_label}: ${suggestion.description}` : undefined}
      >
        {suggestion.button_label}
        <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
      </button>
    </div>
  );
}
