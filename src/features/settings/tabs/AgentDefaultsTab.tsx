"use client";

import { Bot } from "lucide-react";

export function AgentDefaultsTab() {
  return (
    <div data-settings-agent-defaults className="space-y-6">
      <section aria-labelledby="agent-defaults-heading">
        <h3
          id="agent-defaults-heading"
          className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted"
        >
          <Bot className="h-3.5 w-3.5" aria-hidden />
          Agent defaults
        </h3>
        <div className="rounded-lg border border-border bg-surface p-6 text-center">
          <Bot className="mx-auto mb-3 h-8 w-8 text-text-muted" aria-hidden />
          <p className="text-sm font-semibold text-text-primary">
            Agent defaults
          </p>
          <p className="mt-1.5 text-xs text-text-muted">
            Default model, max turns, tool access, and agent behaviour profiles will be configured here.
          </p>
          <span
            className="mt-4 inline-block rounded border border-border bg-chip-bg px-2.5 py-1 text-xs text-text-muted"
            data-placeholder-badge
          >
            Coming soon
          </span>
        </div>
      </section>
    </div>
  );
}
