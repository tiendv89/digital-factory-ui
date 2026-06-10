"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar, Badge, Button, Card, Input } from "@/components/common";
import { useAccountSettings } from "@/components/settings";
import { deriveIconColor } from "@/components/settings/icon-colors";

export function AccountTab() {
  const { meData, loading, error, saving, saveError, updateDisplayName } = useAccountSettings();

  const [displayName, setDisplayName] = useState("");
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (meData?.user.display_name != null) {
      setDisplayName(meData.user.display_name);
    }
  }, [meData?.user.display_name]);

  const handleChange = (v: string) => {
    setDisplayName(v);
    setDirty(true);
    setSaved(false);
  };

  const handleSave = async () => {
    await updateDisplayName(displayName.trim() || null);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span className="text-sm">Loading account…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-8 text-danger">
        <AlertCircle className="h-4 w-4" aria-hidden />
        <span className="text-sm">Failed to load account: {error.message}</span>
      </div>
    );
  }

  const user = meData?.user;
  const memberships = meData?.memberships ?? [];
  const primaryRole = memberships[0]?.role;

  return (
    <div data-settings-account className="space-y-6">
      <h2 className="text-base font-semibold text-text-primary">Account</h2>

      {/* Profile card */}
      <Card className="flex items-center gap-3 p-4">
        <Avatar name={displayName || user?.email} color={deriveIconColor(user?.id ?? user?.email ?? "user")} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">{displayName || user?.email}</p>
          <p className="truncate text-xs text-text-muted">{user?.email}</p>
          {primaryRole && (
            <Badge tone="primary" className="mt-1.5 capitalize">
              {primaryRole}
            </Badge>
          )}
        </div>
      </Card>

      {/* Display name */}
      <div className="flex items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-sm font-medium text-text-primary">Display name</p>
          <p className="mt-0.5 text-xs text-text-muted">Shown on task cards and in chat.</p>
          {saveError && <p className="mt-1.5 text-xs text-danger">{saveError.message}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <Input id="display-name" value={displayName} onChange={(e) => handleChange(e.target.value)} placeholder="Your display name" maxLength={80} className="w-56" />
          <Button variant="primary" onClick={() => void handleSave()} disabled={!dirty || saving} loading={saving}>
            {saving ? "Saving…" : saved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>

      {/* Email */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-text-primary">Email address</p>
          <p className="mt-0.5 text-xs text-text-muted">Used for notifications and login.</p>
        </div>
        <span className="shrink-0 font-mono text-sm text-text-muted">{user?.email}</span>
      </div>
    </div>
  );
}
