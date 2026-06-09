"use client";

import { useState, useEffect } from "react";
import { User, Building2, Monitor, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useAccountSettings } from "../hooks/useAccountSettings";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";

export function AccountTab() {
  const { meData, loading, error, saving, saveError, updateDisplayName } =
    useAccountSettings();
  const { activeWorkspace } = useWorkspaceContext();

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

  return (
    <div data-settings-account className="space-y-6">
      {/* Profile section */}
      <section aria-labelledby="account-profile-heading">
        <h3
          id="account-profile-heading"
          className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted"
        >
          <User className="h-3.5 w-3.5" aria-hidden />
          Profile
        </h3>
        <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
          {/* Email — read-only */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Email
            </label>
            <input
              type="text"
              readOnly
              value={user?.email ?? ""}
              className="w-full rounded border border-border bg-surface-secondary px-3 py-1.5 text-sm text-text-muted outline-none"
              aria-label="Email address (read-only)"
            />
          </div>

          {/* Display name — editable */}
          <div>
            <label
              htmlFor="display-name"
              className="mb-1.5 block text-xs font-medium text-text-secondary"
            >
              Display name
            </label>
            <div className="flex gap-2">
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="Your display name"
                maxLength={80}
                className="flex-1 rounded border border-border bg-surface-secondary px-3 py-1.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!dirty || saving}
                className="flex items-center gap-1.5 rounded border border-border bg-surface-secondary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-nav-item-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : saved ? (
                  <CheckCircle className="h-3.5 w-3.5 text-success" aria-hidden />
                ) : null}
                {saving ? "Saving…" : saved ? "Saved" : "Save"}
              </button>
            </div>
            {saveError && (
              <p className="mt-1.5 text-xs text-danger">{saveError.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* Theme section */}
      <section aria-labelledby="account-theme-heading">
        <h3
          id="account-theme-heading"
          className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted"
        >
          <Monitor className="h-3.5 w-3.5" aria-hidden />
          Theme
        </h3>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Dark (VS Code)</p>
              <p className="mt-0.5 text-xs text-text-muted">
                The only theme available in this version.
              </p>
            </div>
            <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Active
            </span>
          </div>
        </div>
      </section>

      {/* Workspace section */}
      <section aria-labelledby="account-workspace-heading">
        <h3
          id="account-workspace-heading"
          className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted"
        >
          <Building2 className="h-3.5 w-3.5" aria-hidden />
          Current workspace
        </h3>
        <div className="rounded-lg border border-border bg-surface p-4">
          {activeWorkspace ? (
            <div>
              <p className="text-sm font-medium text-text-primary">
                {activeWorkspace.name ?? activeWorkspace.id}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                ID: <span className="font-mono">{activeWorkspace.id}</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-text-muted">No workspace selected.</p>
          )}
        </div>
      </section>

      {/* Organisations section */}
      {memberships.length > 0 && (
        <section aria-labelledby="account-orgs-heading">
          <h3
            id="account-orgs-heading"
            className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted"
          >
            <Building2 className="h-3.5 w-3.5" aria-hidden />
            Organisations
          </h3>
          <div className="rounded-lg border border-border bg-surface divide-y divide-border">
            {memberships.map((m) => (
              <div
                key={m.organization_id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {m.organization_name}
                  </p>
                  <p className="text-xs text-text-muted">
                    @{m.organization_slug}
                  </p>
                </div>
                <span className="rounded border border-border bg-chip-bg px-2 py-0.5 text-xs text-text-secondary capitalize">
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
