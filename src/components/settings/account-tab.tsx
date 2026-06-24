"use client";

import { AlertCircle, Loader2, LogOut, type LucideIcon, MapPin, Monitor, Smartphone } from "lucide-react";

import { useSession } from "@/components/auth";
import { Badge, Button } from "@/components/common";
import { useActiveSessions } from "@/hooks/settings/use-active-sessions";
import type { ActiveSession } from "@/services/user-service";

export function AccountTab() {
  return (
    <div data-settings-account className="space-y-6">
      <h2 className="text-base font-semibold text-text-primary">Security</h2>
      <ActiveSessionsSection />
    </div>
  );
}

const dateFmt = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatTs(unixSeconds: number): string {
  if (!unixSeconds) return "—";
  return dateFmt.format(new Date(unixSeconds * 1000));
}

function deviceIcon(device: string): LucideIcon {
  return /iOS|Android|iPhone|iPad|Mobile/i.test(device) ? Smartphone : Monitor;
}

function ActiveSessionsSection() {
  const { logout } = useSession();
  const { sessions, loading, error, revoke, revokingId, logoutAll, loggingOutAll } = useActiveSessions();

  const handleLogoutAll = async () => {
    if (!window.confirm("Log out of all devices? You'll need to sign in again everywhere, including here.")) return;
    await logoutAll();
    await logout(); // clear local session + redirect to /login
  };

  const handleRevoke = async (s: ActiveSession) => {
    if (s.current) {
      if (!window.confirm("This is your current session. Revoking it will sign you out here.")) return;
      await revoke(s.id);
      await logout();
      return;
    }
    if (!window.confirm("Revoke this session? That device will be signed out.")) return;
    await revoke(s.id);
  };

  return (
    <div data-active-sessions className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Active sessions</h3>
          <p className="mt-0.5 text-xs text-text-muted">Devices currently signed in to your account.</p>
        </div>
        <Button
          variant="ghost"
          onClick={() => void handleLogoutAll()}
          disabled={loggingOutAll || sessions.length === 0}
          loading={loggingOutAll}
          className="shrink-0 gap-1.5 border border-border text-danger hover:bg-danger-bg hover:text-danger"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
          Log out of all devices
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span className="text-sm">Loading sessions…</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-bg px-3 py-3 text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          <span className="text-sm">Failed to load sessions: {error.message}</span>
        </div>
      ) : sessions.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-text-muted">No active sessions.</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const Icon = deviceIcon(s.device);
            const location = s.location || s.ip_address;
            return (
              <li key={s.id} data-session-row={s.id} className="group flex items-center gap-3.5 rounded-lg border border-border bg-surface px-3.5 py-3 transition-colors hover:border-border-control">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-secondary text-text-secondary">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-text-primary">{s.device || "Unknown device"}</span>
                    {s.current && (
                      <Badge tone="primary" className="shrink-0">
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-muted">
                    {location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                        {location}
                      </span>
                    )}
                    {location && <span aria-hidden>·</span>}
                    <span>Last active {formatTs(s.last_seen_at)}</span>
                    <span aria-hidden>·</span>
                    <span>Signed in {formatTs(s.created_at)}</span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => void handleRevoke(s)}
                  disabled={revokingId === s.id}
                  loading={revokingId === s.id}
                  className="shrink-0 text-text-muted opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                >
                  Revoke
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
