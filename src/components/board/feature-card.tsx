"use client";

import type { ParsedFeature } from "@/services/yaml-parser";

import { lifecycleMeta } from "./board-meta";
import { LifecycleGlyph } from "./status-glyph";

/** Kanban feature card — feature identity + lifecycle badge + task progress. */
export function FeatureCard({ feature, onClick }: { feature: ParsedFeature; onClick?: () => void }) {
  const meta = lifecycleMeta(feature.featureStatus);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="mb-1.5 cursor-pointer rounded-lg border border-border bg-surface p-2.5 transition-colors hover:border-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* Feature id tag */}
      <div className="mb-2 flex items-center gap-1.5">
        <LifecycleGlyph stage={feature.featureStatus} size={12} />
        <span className="truncate font-mono text-[10px] text-text-secondary">{feature.id}</span>
      </div>

      {/* Title */}
      <p className="mb-2.5 text-[12px] font-medium leading-snug text-text-primary">{feature.title}</p>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex h-4.5 shrink-0 items-center rounded-full px-2 text-[10px] font-semibold" style={{ backgroundColor: meta.bg, color: meta.color }}>
          {meta.label}
        </span>
      </div>
    </div>
  );
}
