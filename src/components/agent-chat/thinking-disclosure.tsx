"use client";

import { Brain, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ThinkingDisclosureProps = {
  thinking: string;
  /** When true the turn is still streaming — the disclosure stays expanded live. */
  streaming: boolean;
  /** Wall-clock seconds the turn took; shown as "Thought for …" once streaming ends. */
  durationSeconds?: number;
};

/** Format a duration like Claude: "58s", "1m58s", "1h02m". */
function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m${seconds.toString().padStart(2, "0")}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h${(minutes % 60).toString().padStart(2, "0")}m`;
}

/**
 * Shows the agent's reasoning trace while it streams (live, expanded), then
 * collapses to a "Thought for …" summary when the turn ends.
 *
 * Mirrors the ToolCallGroup collapse idiom (useState + ChevronRight).
 * Ephemeral: lives only in React state; gone on refresh (G3/G4).
 */
export function ThinkingDisclosure({ thinking, streaming, durationSeconds }: ThinkingDisclosureProps) {
  const [expanded, setExpanded] = useState(true);

  // Collapse automatically the moment the turn finishes streaming, so the
  // disclosure settles into its "Thought for …" summary like Claude does.
  const prevStreamingRef = useRef(streaming);
  useEffect(() => {
    if (prevStreamingRef.current && !streaming) setExpanded(false);
    prevStreamingRef.current = streaming;
  }, [streaming]);

  if (!thinking) return null;

  const isExpanded = streaming || expanded;
  const label = streaming ? "Thinking…" : durationSeconds != null ? `Thought for ${formatDuration(durationSeconds)}` : "Show thinking";

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
        <span className="font-medium">{label}</span>
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
