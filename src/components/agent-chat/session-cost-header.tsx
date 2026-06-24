"use client";

import { Badge } from "@/components/common/badge";
import type { SessionQuota } from "@/services/workflow-bff/cost";

type SessionCostHeaderProps = {
  sessionCredits: number;
  quota: SessionQuota;
};

function formatCredits(n: number): string {
  return n.toLocaleString();
}

export function SessionCostHeader({ sessionCredits, quota }: SessionCostHeaderProps) {
  const dailyRemaining = Math.max(0, quota.daily_cap - quota.daily_used);

  return (
    <div data-session-cost-header className="flex shrink-0 items-center gap-2 border-b border-border bg-surface px-3 py-1.5 text-[11px] text-text-secondary">
      <span className="font-medium text-text-primary">
        Session: {formatCredits(sessionCredits)} {sessionCredits === 1 ? "credit" : "credits"}
      </span>
      <span className="text-text-muted">·</span>
      <span>
        Daily: {formatCredits(dailyRemaining)} / {formatCredits(quota.daily_cap)}
      </span>
      <Badge tone="neutral" className="shrink-0">
        {quota.plan_name}
      </Badge>
    </div>
  );
}
