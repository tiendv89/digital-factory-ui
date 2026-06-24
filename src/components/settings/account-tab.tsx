"use client";

import { AlertCircle, Loader2, Monitor } from "lucide-react";

import { useSession } from "@/components/auth";
import { Badge, Button } from "@/components/common";
import { useActiveSessions } from "@/hooks/settings/use-active-sessions";
import type { ActiveSession } from "@/services/user-service";

export function AccountTab() {
  return (
    <div data-settings-account className="space-y-6">
      <h2 className="text-base font-semibold text-text-primary">Account</h2>
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
    <div data-active-sessions className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Active sessions</h3>
          <p className="mt-0.5 text-xs text-text-muted">Devices currently signed in to your account.</p>
        </div>
        <Button variant="ghost" onClick={() => void handleLogoutAll()} disabled={loggingOutAll || sessions.length === 0} loading={loggingOutAll}>
          Log out of all devices
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span className="text-sm">Loading sessions…</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 py-6 text-danger">
          <AlertCircle className="h-4 w-4" aria-hidden />
          <span className="text-sm">Failed to load sessions: {error.message}</span>
        </div>
      ) : sessions.length === 0 ? (
        <p className="py-6 text-sm text-text-muted">No active sessions.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-text-muted">
                <th className="py-2 pr-4 font-medium">Device</th>
                <th className="py-2 pr-4 font-medium">Location</th>
                <th className="py-2 pr-4 font-medium">Created</th>
                <th className="py-2 pr-4 font-medium">Updated</th>
                <th className="py-2 pl-4 text-right font-medium" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="group border-b border-border/60 last:border-0">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
                      <span className="font-medium text-text-primary">{s.device || "Unknown device"}</span>
                      {s.current && (
                        <Badge tone="primary" className="ml-1">
                          Current
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-text-secondary">{s.location || s.ip_address || "—"}</td>
                  <td className="py-3 pr-4 whitespace-nowrap text-text-secondary">{formatTs(s.created_at)}</td>
                  <td className="py-3 pr-4 whitespace-nowrap text-text-secondary">{formatTs(s.last_seen_at)}</td>
                  <td className="py-3 pl-4 text-right">
                    <Button
                      variant="ghost"
                      onClick={() => void handleRevoke(s)}
                      disabled={revokingId === s.id}
                      loading={revokingId === s.id}
                      className="text-danger opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      Revoke
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
