"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge, Button, cn } from "@/components/common";
import { computeBarState, formatDailyCountdown, formatRelativeTimestamp, formatWeeklyCountdown, useQuota } from "@/hooks/settings/use-quota";

const BAR_COLOR: Record<"neutral" | "warning" | "danger", string> = {
  neutral: "bg-primary",
  warning: "bg-warning",
  danger: "bg-danger",
};

const BADGE_TONE: Record<"neutral" | "warning" | "danger", "neutral" | "warning" | "danger"> = {
  neutral: "neutral",
  warning: "warning",
  danger: "danger",
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

export function UsageTab() {
  const { quota, loading, error, fetchedAt, refresh } = useQuota();
  const [now, setNow] = useState(() => new Date());

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

  if (error || !quota) {
    return (
      <div className="flex flex-col items-start gap-3 py-4">
        <p className="text-sm text-danger">{error?.message ?? "Failed to load quota."}</p>
        <Button variant="secondary" size="sm" onClick={refresh}>
          Retry
        </Button>
      </div>
    );
  }

  const daily = computeBarState(quota.daily_used, quota.daily_cap, quota.daily_reset_at);
  const weekly = computeBarState(quota.weekly_used, quota.weekly_cap, quota.weekly_reset_at);

  const dailyCountdown = formatDailyCountdown(daily.resetAt, now);
  const weeklyCountdown = formatWeeklyCountdown(weekly.resetAt);
  const lastUpdated = fetchedAt ? formatRelativeTimestamp(fetchedAt, now) : "—";

  const planBadgeTone = BADGE_TONE[daily.color === "danger" || weekly.color === "danger" ? "danger" : daily.color === "warning" || weekly.color === "warning" ? "warning" : "neutral"];

  return (
    <div className="space-y-6" data-usage-tab>
      {/* Header */}
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-text-primary">Your usage limits</h2>
        <Badge tone={planBadgeTone}>{quota.plan_name}</Badge>
      </div>

      {/* Daily */}
      <QuotaSection label="Daily" pct={daily.pct} color={daily.color} countdown={dailyCountdown} />

      {/* Weekly */}
      <QuotaSection label="Weekly" pct={weekly.pct} color={weekly.color} countdown={weeklyCountdown} />

      {/* Footer */}
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
