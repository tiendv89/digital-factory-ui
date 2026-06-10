"use client";

export type { NotificationsPrefs } from "@/stores/notifications";
import { useNotificationsStore } from "@/stores/notifications";

export function useNotificationsPrefs() {
  const agentActivity = useNotificationsStore((s) => s.agentActivity);
  const gateRequests = useNotificationsStore((s) => s.gateRequests);
  const taskReviews = useNotificationsStore((s) => s.taskReviews);
  const weeklyDigest = useNotificationsStore((s) => s.weeklyDigest);
  const toggle = useNotificationsStore((s) => s.toggle);

  return {
    prefs: { agentActivity, gateRequests, taskReviews, weeklyDigest },
    toggle,
  };
}
