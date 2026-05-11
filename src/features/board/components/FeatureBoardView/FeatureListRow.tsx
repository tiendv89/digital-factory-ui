"use client";

import { Clock3, Layers3 } from "lucide-react";
import type { ParsedFeature } from "@/services/yaml-parser";
import {
  formatTimestamp,
  getFeatureLastModifiedAt,
  isTodayTimestamp,
} from "@/lib/time";
import { getFeatureStatusColor, getFeatureStatusLabel } from "../../lib/status";

type FeatureListRowProps = {
  feature: ParsedFeature;
  onClick: () => void;
};

function FeatureStatusPill({ status }: { status: string }) {
  const color = getFeatureStatusColor(status);
  const label = getFeatureStatusLabel(status);
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        color,
        background: `${color}18`,
        border: `1px solid ${color}40`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

export function FeatureListRow({ feature, onClick }: FeatureListRowProps) {
  const lastModifiedAt = getFeatureLastModifiedAt(feature);
  const modifiedToday = lastModifiedAt ? isTodayTimestamp(lastModifiedAt) : false;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={`Open feature detail for ${feature.title || feature.id}`}
      className="flex min-h-12 w-full cursor-pointer items-center gap-3 border-b border-border bg-surface px-5 py-2 transition-colors hover:bg-surface-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Layers3 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
        <div className="min-w-0">
          <p
            className="truncate text-sm font-semibold uppercase text-text-primary"
            title={feature.id}
          >
            {feature.id}
          </p>
          {feature.title && feature.title !== feature.id && (
            <p className="truncate text-xs text-text-secondary" title={feature.title}>
              {feature.title}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <FeatureStatusPill status={feature.featureStatus} />
        {lastModifiedAt && (
          <span
            data-feature-modified-at={lastModifiedAt}
            data-modified-today={modifiedToday ? "true" : "false"}
            className={
              "flex min-w-0 shrink-0 items-center gap-1.5 rounded px-2 py-1 text-xs " +
              (modifiedToday
                ? "bg-success-bg font-semibold text-success"
                : "text-text-muted")
            }
            title={`Modified ${lastModifiedAt}`}
          >
            <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">Modified {formatTimestamp(lastModifiedAt)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
