"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getUsage, type OrgUsage } from "@/services/user-service/usage";

const usageKeys = {
  me: () => ["settings", "usage", "me"] as const,
};

export interface QuotaBarState {
  used: number;
  cap: number;
  pct: number;
  /** neutral < 80, warning 80–99, danger 100 */
  color: "neutral" | "warning" | "danger";
  resetAt: Date;
}

export function computeBarState(used: number, cap: number, resetAt: string): QuotaBarState {
  const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
  const color: QuotaBarState["color"] = pct >= 100 ? "danger" : pct >= 80 ? "warning" : "neutral";
  return { used, cap, pct, color, resetAt: new Date(resetAt) };
}

export function formatDailyCountdown(resetAt: Date, now: Date): string {
  const diffMs = resetAt.getTime() - now.getTime();
  if (diffMs <= 0) return "Resets soon";
  const totalMins = Math.floor(diffMs / 60_000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `Resets in ${hrs}h ${mins}m`;
}

export function formatWeeklyCountdown(resetAt: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const day = days[resetAt.getDay()];
  const hours = resetAt.getHours();
  const mins = resetAt.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  const m = mins.toString().padStart(2, "0");
  return `Resets ${day} ${h}:${m} ${ampm}`;
}

export function formatRelativeTimestamp(fetchedAt: Date, now: Date): string {
  const diffSec = Math.floor((now.getTime() - fetchedAt.getTime()) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

/** useUsage returns the caller's per-org usage sections. */
export function useUsage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, dataUpdatedAt } = useQuery<OrgUsage[], Error>({
    queryKey: usageKeys.me(),
    queryFn: () => getUsage(),
    staleTime: 30_000,
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: usageKeys.me() });
  }

  return {
    sections: data ?? [],
    loading: isLoading,
    error: error ?? null,
    fetchedAt: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
    refresh,
  };
}
