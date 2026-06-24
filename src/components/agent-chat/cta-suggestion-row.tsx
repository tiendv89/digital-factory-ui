"use client";

import { useEffect, useState } from "react";

import { CTACard } from "./cta-card";
import type { CtaSuggestion } from "./types";

type CTASuggestionRowProps = {
  suggestions: CtaSuggestion[];
  active: boolean;
  onAction: (actionText: string) => void;
};

export function CTASuggestionRow({ suggestions, active, onAction }: CTASuggestionRowProps) {
  const [visible, setVisible] = useState(!active);

  // Fade in on mount only when active (post-reply row — after turn end)
  useEffect(() => {
    if (!active) {
      setVisible(true);
      return;
    }
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [active]);

  if (suggestions.length === 0) return null;

  return (
    <div
      data-cta-suggestion-row
      data-active={active}
      className={`flex flex-row flex-wrap gap-2 transition-opacity duration-300 @container ${visible ? "opacity-100" : "opacity-0"}`}
      role="group"
      aria-label="Suggested next actions"
    >
      {suggestions.slice(0, 3).map((s) => (
        <CTACard key={s.id} suggestion={s} active={active} onAction={onAction} />
      ))}
    </div>
  );
}
