"use client";

import { Clock3 } from "lucide-react";
import { formatTimestamp } from "@/lib/time";
import { formatStatusLabel } from "@/features/tasks/lib/status";
import { tokenizeText } from "@/lib/url-tokenizer";
import type { ActivityEvent, FeatureDetail } from "@/services/workflow-backend/types";

type FeatureLogEntry = ActivityEvent & {
  sortTime: number;
  sequence: number;
};

function getSortedFeatureLogs(
  activity: FeatureDetail["activity"],
): FeatureLogEntry[] {
  if (!activity || activity.length === 0) return [];

  return activity
    .map((entry, sequence) => {
      const entryTime = new Date(entry.occurred_at).getTime();
      return {
        ...entry,
        sequence,
        sortTime: Number.isNaN(entryTime)
          ? Number.NEGATIVE_INFINITY
          : entryTime,
      };
    })
    .sort((a, b) => {
      if (a.sortTime !== b.sortTime) return b.sortTime - a.sortTime;
      return a.sequence - b.sequence;
    });
}

export function FeatureLogsPanel({ feature }: { feature: FeatureDetail }) {
  const logs = getSortedFeatureLogs(feature.activity);

  return (
    <div data-feature-logs-panel className="px-6 py-6">
      <section className="w-1/2 bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-text-primary">
            <Clock3 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            Feature Logs
          </h2>
          <span className="border border-border bg-surface-secondary px-2 py-1 font-mono text-xs text-text-muted">
            status.yaml
          </span>
        </div>
        {logs.length > 0 ? (
          <ol className="px-5 py-4">
            {logs.map((entry, index) => (
              <FeatureLogItem
                key={`${entry.scope}-${entry.action}-${entry.occurred_at}-${index}`}
                entry={entry}
                isLast={index === logs.length - 1}
              />
            ))}
          </ol>
        ) : (
          <p className="px-5 py-8 text-sm italic text-text-muted">
            No activity logs available.
          </p>
        )}
      </section>
    </div>
  );
}

function FeatureLogNoteText({ text }: { text: string }) {
  const tokens = tokenizeText(text);
  return (
    <>
      {tokens.map((token, i) =>
        token.type === "link" ? (
          <a
            key={i}
            href={token.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:opacity-80"
            data-feature-log-link
          >
            {token.label}
          </a>
        ) : (
          <span key={i}>{token.value}</span>
        ),
      )}
    </>
  );
}

function FeatureLogItem({
  entry,
  isLast,
}: {
  entry: FeatureLogEntry;
  isLast: boolean;
}) {
  const scopeLabel = entry.scope ? entry.scope.replace(/_/g, " ") : "feature";

  return (
    <li data-feature-log-entry className="flex gap-4">
      <div className="flex flex-col items-center pt-2">
        <span
          className="h-1.5 w-1.5 rounded-full bg-success"
          aria-hidden="true"
        />
        {isLast ? null : (
          <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
        )}
      </div>
      <div className="mb-4 min-w-0 flex-1 border border-border bg-surface-secondary px-4 py-3">
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold capitalize text-text-primary">
              {formatStatusLabel(entry.action)}
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              {scopeLabel} by {entry.actor}
            </p>
          </div>
          <span className="shrink-0 text-xs text-text-muted">
            {formatTimestamp(entry.occurred_at)}
          </span>
        </div>
        {entry.note ? (
          <p className="mt-3 border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
            <FeatureLogNoteText text={entry.note} />
          </p>
        ) : null}
      </div>
    </li>
  );
}
