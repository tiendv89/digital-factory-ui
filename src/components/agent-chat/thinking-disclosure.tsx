"use client";

import { Brain, ChevronRight } from "lucide-react";
import { useState } from "react";

type ThinkingDisclosureProps = {
  thinking: string;
  /** When true the turn is still streaming — the disclosure stays expanded live. */
  streaming: boolean;
};

/**
 * Shows the agent's reasoning trace while it streams (live, expanded), then
 * collapses to a "Show thinking" toggle when the turn ends.
 *
 * Mirrors the ToolCallGroup collapse idiom (useState + ChevronRight).
 * Ephemeral: lives only in React state; gone on refresh (G3/G4).
 */
export function ThinkingDisclosure({ thinking, streaming }: ThinkingDisclosureProps) {
  const [expanded, setExpanded] = useState(true);

  if (!thinking) return null;

  const isExpanded = streaming || expanded;

  return (
    <div data-thinking-disclosure data-streaming={streaming} className="flex flex-col">
      <button
        type="button"
        onClick={() => {
          if (!streaming) setExpanded((v) => !v);
        }}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "Hide thinking" : "Show thinking"}
        className="group flex items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-xs text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-secondary"
      >
        <Brain className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="font-medium">{streaming ? "Thinking…" : "Show thinking"}</span>
        {!streaming && <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} aria-hidden="true" />}
      </button>
      {isExpanded && (
        <div data-thinking-content className="mt-1 border-l border-border pl-2.5 text-[11px] leading-relaxed text-text-muted">
          {thinking}
        </div>
      )}
    </div>
  );
}
