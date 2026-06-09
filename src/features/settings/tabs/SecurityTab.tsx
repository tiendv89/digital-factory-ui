"use client";

import { Shield } from "lucide-react";

export function SecurityTab() {
  return (
    <div data-settings-security className="space-y-6">
      <section aria-labelledby="security-heading">
        <h3
          id="security-heading"
          className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted"
        >
          <Shield className="h-3.5 w-3.5" aria-hidden />
          Security
        </h3>
        <div className="rounded-lg border border-border bg-surface p-6 text-center">
          <Shield className="mx-auto mb-3 h-8 w-8 text-text-muted" aria-hidden />
          <p className="text-sm font-semibold text-text-primary">
            Security settings
          </p>
          <p className="mt-1.5 text-xs text-text-muted">
            Password management, two-factor authentication, and active sessions will be configurable here.
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
