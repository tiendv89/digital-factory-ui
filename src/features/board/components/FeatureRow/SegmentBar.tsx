"use client";

import { STATUS_TONE, type StatusKey } from "../../lib/status";
import type { TaskSegment } from "../../lib/filter";

export type SegmentBarProps = {
  segments: TaskSegment[];
  total: number;
};

export function SegmentBar({ segments, total }: SegmentBarProps) {
  if (total === 0 || segments.length === 0) {
    return (
      <div
        className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted-bg"
        aria-label="No tasks"
      />
    );
  }

  return (
    <div
      className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted-bg"
      role="img"
      aria-label={`Task progress segments: ${segments.length} statuses`}
    >
      {segments.map((segment) => {
        const tone = STATUS_TONE[segment.status as StatusKey];
        const widthPct = (segment.count / total) * 100;
        return (
          <span
            key={segment.status}
            className={`h-full ${tone.segment}`}
            style={{ width: `${widthPct}%` }}
            title={`${segment.status.replace(/_/g, " ")}: ${segment.count}`}
          />
        );
      })}
    </div>
  );
}
