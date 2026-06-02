"use client";

import { ActivityFeed } from "../ActivityFeed";
import type { ActivityEvent } from "@/services/workflow-backend/types";

type FeatureLogsPanelProps = {
  events: ActivityEvent[];
  loading?: boolean;
};

export function FeatureLogsPanel({ events, loading = false }: FeatureLogsPanelProps) {
  return (
    <div data-feature-logs-panel className="px-6 py-6">
      <div className="w-1/2 bg-surface">
        <ActivityFeed events={events} loading={loading} title="Feature Logs" />
      </div>
    </div>
  );
}
