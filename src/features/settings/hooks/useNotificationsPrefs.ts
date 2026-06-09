"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "workflow:notifications-prefs";

export interface NotificationsPrefs {
  agentActivity: boolean;
  gateRequests: boolean;
  taskReviews: boolean;
  weeklyDigest: boolean;
}

const DEFAULTS: NotificationsPrefs = {
  agentActivity: true,
  gateRequests: true,
  taskReviews: true,
  weeklyDigest: false,
};

function load(): NotificationsPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<NotificationsPrefs>) };
  } catch {
    return DEFAULTS;
  }
}

function save(prefs: NotificationsPrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function useNotificationsPrefs() {
  const [prefs, setPrefs] = useState<NotificationsPrefs>(load);

  const toggle = useCallback((key: keyof NotificationsPrefs) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      save(next);
      return next;
    });
  }, []);

  return { prefs, toggle };
}
