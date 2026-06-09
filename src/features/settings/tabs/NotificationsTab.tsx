"use client";

import { Bell } from "lucide-react";
import { useNotificationsPrefs } from "../hooks/useNotificationsPrefs";
import type { NotificationsPrefs } from "../hooks/useNotificationsPrefs";

type PrefRow = {
  key: keyof NotificationsPrefs;
  label: string;
  description: string;
};

const PREF_ROWS: PrefRow[] = [
  {
    key: "agentActivity",
    label: "Agent activity",
    description: "Status updates when agents start, complete, or get blocked.",
  },
  {
    key: "gateRequests",
    label: "Gate requests",
    description: "Notifications for approval gates that need your review.",
  },
  {
    key: "taskReviews",
    label: "Task reviews",
    description: "Alerts when a task moves to in-review or is approved.",
  },
  {
    key: "weeklyDigest",
    label: "Weekly digest",
    description: "A summary of activity across your workspaces each week.",
  },
];

export function NotificationsTab() {
  const { prefs, toggle } = useNotificationsPrefs();

  return (
    <div data-settings-notifications className="space-y-6">
      <section aria-labelledby="notif-heading">
        <h3
          id="notif-heading"
          className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted"
        >
          <Bell className="h-3.5 w-3.5" aria-hidden />
          In-app notifications
        </h3>
        <p className="mb-4 text-xs text-text-muted">
          Preferences are saved locally in your browser. No server account required.
        </p>
        <div className="rounded-lg border border-border bg-surface divide-y divide-border">
          {PREF_ROWS.map((row) => (
            <label
              key={row.key}
              className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-surface-secondary"
              data-notif-row={row.key}
            >
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-text-primary">{row.label}</p>
                <p className="mt-0.5 text-xs text-text-muted">{row.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs[row.key]}
                aria-label={`Toggle ${row.label}`}
                onClick={() => toggle(row.key)}
                className={
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
                  (prefs[row.key] ? "bg-primary" : "bg-border")
                }
              >
                <span
                  aria-hidden
                  className={
                    "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 " +
                    (prefs[row.key] ? "translate-x-4" : "translate-x-0")
                  }
                />
              </button>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
