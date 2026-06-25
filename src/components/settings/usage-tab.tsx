"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge, Button, cn } from "@/components/common";
import { computeBarState, formatDailyCountdown, formatRelativeTimestamp, formatWeeklyCountdown, useUsage } from "@/hooks/settings/use-quota";
import type { OrgUsage } from "@/services/user-service/usage";
import { useOrgWorkspaceStore } from "@/stores/org-workspace";

const BAR_COLOR: Record<"neutral" | "warning" | "danger", string> = {
  neutral: "bg-primary",
  warning: "bg-warning",
  danger: "bg-danger",
};

interface QuotaSectionProps {
  label: string;
  pct: number;
  color: "neutral" | "warning" | "danger";
  countdown: string;
}

function QuotaSection({ label, pct, color, countdown }: QuotaSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <span className={cn("text-sm font-medium", color === "danger" ? "text-danger" : color === "warning" ? "text-warning" : "text-text-secondary")}>{pct}% used</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-secondary" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} usage`}>
        <div className={cn("h-full rounded-full transition-all", BAR_COLOR[color])} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-text-muted">{countdown}</p>
    </div>
  );
}

function OrgUsageCard({ usage, now }: { usage: OrgUsage; now: Date }) {
  const daily = computeBarState(usage.daily_used, usage.daily_cap, usage.daily_reset_at);
  const weekly = computeBarState(usage.weekly_used, usage.weekly_cap, usage.weekly_reset_at);
  const tone = daily.color === "danger" || weekly.color === "danger" ? "danger" : daily.color === "warning" || weekly.color === "warning" ? "warning" : "neutral";

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-4" data-usage-org={usage.org_id}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{usage.org_name}</h3>
        <Badge tone={tone}>{usage.plan_display_name || usage.plan_name}</Badge>
      </div>
      <QuotaSection label="Daily" pct={daily.pct} color={daily.color} countdown={formatDailyCountdown(daily.resetAt, now)} />
      <QuotaSection label="Weekly" pct={weekly.pct} color={weekly.color} countdown={formatWeeklyCountdown(weekly.resetAt)} />
    </section>
  );
}

export function UsageTab() {
  const { sections, loading, error, fetchedAt, refresh } = useUsage();
  const selectedOrgSlug = useOrgWorkspaceStore((s) => s.selectedOrgSlug);
  const [now, setNow] = useState(() => new Date());

  // Show only the currently active org (from the top-nav switcher). Fall back to
  // the first section if the active org isn't resolved yet / has no usage row.
  const active = sections.find((s) => s.org_slug === selectedOrgSlug) ?? sections[0] ?? null;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted">
        <span className="text-sm">Loading usage…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 py-4">
        <p className="text-sm text-danger">{error.message ?? "Failed to load usage."}</p>
        <Button variant="secondary" size="sm" onClick={refresh}>
          Retry
        </Button>
      </div>
    );
  }

  const lastUpdated = fetchedAt ? formatRelativeTimestamp(fetchedAt, now) : "—";

  return (
    <div className="space-y-6" data-usage-tab>
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-text-primary">Your usage limits</h2>
      </div>

      {active === null ? (
        <p className="text-sm text-text-muted">You&apos;re not a member of any organization yet.</p>
      ) : (
        <OrgUsageCard key={active.org_id} usage={active} now={now} />
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="text-xs text-text-muted">Last updated: {lastUpdated}</span>
        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh usage"
          className="flex items-center gap-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Refresh
        </button>
      </div>
    </div>
  );
}
