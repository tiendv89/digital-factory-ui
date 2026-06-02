"use client";

import { Activity } from "lucide-react";
import { formatTimestamp } from "@/lib/time";
import { tokenizeText } from "@/lib/url-tokenizer";
import type { ActivityEvent } from "@/services/workflow-backend/types";

type ActivityFeedProps = {
  events: ActivityEvent[];
  loading?: boolean;
  title?: string;
};

export function ActivityFeed({
  events,
  loading = false,
  title = "Activity",
}: ActivityFeedProps) {
  return (
    <section data-activity-feed className="w-full">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-text-primary">
          <Activity className="h-3.5 w-3.5 text-success" aria-hidden="true" />
          {title}
        </h2>
      </div>
      {loading ? (
        <p className="px-5 py-4 text-sm italic text-text-muted">
          Loading activity…
        </p>
      ) : events.length === 0 ? (
        <p className="px-5 py-4 text-sm italic text-text-muted">
          No activity yet.
        </p>
      ) : (
        <ol className="px-4 py-3" data-activity-feed-list>
          {events.map((event, index) => (
            <ActivityFeedItem
              key={`${event.scope}-${event.action}-${event.occurred_at}-${index}`}
              event={event}
              isLast={index === events.length - 1}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function ActivityNoteText({ text }: { text: string }) {
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
            data-activity-feed-link
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

function ActivityFeedItem({
  event,
  isLast,
}: {
  event: ActivityEvent;
  isLast: boolean;
}) {
  return (
    <li data-activity-feed-item className="flex gap-3">
      <div className="flex flex-col items-center pt-2">
        <span
          className="h-1.5 w-1.5 rounded-full bg-success"
          aria-hidden="true"
        />
        {isLast ? null : (
          <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
        )}
      </div>
      <div className="mb-3 min-w-0 flex-1 border border-border bg-surface-secondary px-3 py-2">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              className="text-xs font-semibold capitalize text-text-primary"
              data-activity-action
            >
              {event.action}
            </h3>
            {event.actor ? (
              <p className="mt-0.5 text-[11px] text-text-muted">
                by {event.actor}
              </p>
            ) : null}
          </div>
          <span className="shrink-0 text-[11px] text-text-muted">
            {formatTimestamp(event.occurred_at)}
          </span>
        </div>
        {event.note ? (
          <p className="mt-2 border border-border bg-surface px-2 py-1.5 text-xs text-text-secondary">
            <ActivityNoteText text={event.note} />
          </p>
        ) : null}
      </div>
    </li>
  );
}
