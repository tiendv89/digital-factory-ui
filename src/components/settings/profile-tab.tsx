"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Avatar, Badge, Button, Card, Field, Input } from "@/components/common";
import { deriveIconColor } from "@/components/settings/icon-colors";
import { useProfileSettings, validateUsername } from "@/hooks/settings/use-profile-settings";

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  github: "GitHub",
};

function ProviderBadge({ provider }: { provider: string }) {
  const label = PROVIDER_LABELS[provider] ?? provider;
  return (
    <Badge tone="neutral" className="capitalize">
      {label}
    </Badge>
  );
}

function AvatarPreview({ url }: { url: string }) {
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!url) {
      setValid(null);
      return;
    }
    setValid(null);
    const img = new Image();
    img.onload = () => setValid(true);
    img.onerror = () => setValid(false);
    img.src = url;
  }, [url]);

  if (!url) return null;

  return (
    <div className="mt-2 flex items-center gap-2">
      {valid === true && <img src={url} alt="Avatar preview" className="h-10 w-10 rounded-full object-cover ring-1 ring-border" />}
      {valid === false && (
        <div className="flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Image could not be loaded.</span>
        </div>
      )}
    </div>
  );
}

export function ProfileTab() {
  const { meData, loading, error, saving, saveError, updateProfile, resetError } = useProfileSettings();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const initialRef = useRef({ displayName: "", username: "", avatarUrl: "" });

  useEffect(() => {
    if (!meData) return;
    const dn = meData.user.display_name ?? "";
    const un = meData.user.username ?? "";
    const au = meData.user.avatar_url ?? "";
    setDisplayName(dn);
    setUsername(un);
    setAvatarUrl(au);
    initialRef.current = { displayName: dn, username: un, avatarUrl: au };
  }, [meData]);

  const markDirty = () => {
    setDirty(true);
    setSaved(false);
    resetError();
  };

  const handleUsernameChange = (v: string) => {
    const normalized = v.toLowerCase();
    setUsername(normalized);
    setUsernameError(normalized ? validateUsername(normalized) : null);
    markDirty();
  };

  const handleDisplayNameChange = (v: string) => {
    setDisplayName(v);
    markDirty();
  };

  const handleAvatarUrlChange = (v: string) => {
    setAvatarUrl(v);
    markDirty();
  };

  const isUsernameConflict = (saveError as (Error & { status?: number }) | null)?.status === 409;

  const handleSave = async () => {
    if (username) {
      const err = validateUsername(username);
      if (err) {
        setUsernameError(err);
        return;
      }
    }

    const { displayName: initDn, username: initUn, avatarUrl: initAu } = initialRef.current;
    const body: Record<string, string | null> = {};
    if (displayName !== initDn) body.display_name = displayName.trim() || null;
    if (username !== initUn) body.username = username.trim() || null;
    if (avatarUrl !== initAu) body.avatar_url = avatarUrl.trim() || null;

    if (Object.keys(body).length === 0) {
      setDirty(false);
      return;
    }

    await updateProfile(body);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span className="text-sm">Loading profile…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-8 text-danger">
        <AlertCircle className="h-4 w-4" aria-hidden />
        <span className="text-sm">Failed to load profile: {error.message}</span>
      </div>
    );
  }

  const user = meData?.user;
  const linkedProviders = user?.linked_providers ?? [];

  return (
    <div data-settings-profile className="space-y-6">
      <h2 className="text-base font-semibold text-text-primary">Profile</h2>

      {/* Profile card */}
      <Card className="flex items-center gap-3 p-4">
        <AvatarImageOrFallback avatarUrl={avatarUrl} name={displayName || user?.email} userId={user?.id ?? user?.email ?? "user"} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">{displayName || user?.email}</p>
          {username && <p className="truncate text-xs text-text-muted">@{username}</p>}
          <p className="truncate text-xs text-text-muted">{user?.email}</p>
        </div>
      </Card>

      {/* Display name */}
      <div className="flex items-start justify-between gap-4 border-b border-border pb-6">
        <div className="min-w-0 flex-1">
          <Field label="Display name" hint="Shown on task cards and in chat.">
            <Input id="profile-display-name" value={displayName} onChange={(e) => handleDisplayNameChange(e.target.value)} placeholder="Your display name" maxLength={80} className="max-w-xs" />
          </Field>
        </div>
      </div>

      {/* Username */}
      <div className="flex items-start justify-between gap-4 border-b border-border pb-6">
        <div className="min-w-0 flex-1">
          <Field label="Username" hint={usernameError ? undefined : "Lowercase letters, numbers, hyphens, underscores. 3–30 characters."}>
            <div className="flex items-center gap-0">
              <span className="flex h-9 items-center rounded-l-[8px] border border-r-0 border-border-control bg-surface px-2.5 text-sm text-text-muted select-none">@</span>
              <Input
                id="profile-username"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="username"
                maxLength={30}
                className="max-w-xs rounded-l-none"
                aria-invalid={!!(usernameError || isUsernameConflict)}
                aria-describedby={usernameError || isUsernameConflict ? "username-error" : undefined}
              />
            </div>
            {(usernameError || isUsernameConflict) && (
              <p id="username-error" className="mt-1 text-xs text-danger">
                {isUsernameConflict ? "Username already taken." : usernameError}
              </p>
            )}
          </Field>
        </div>
      </div>

      {/* Avatar URL */}
      <div className="flex items-start justify-between gap-4 border-b border-border pb-6">
        <div className="min-w-0 flex-1">
          <Field label="Avatar URL" hint="Paste a public image URL.">
            <Input id="profile-avatar-url" value={avatarUrl} onChange={(e) => handleAvatarUrlChange(e.target.value)} placeholder="https://example.com/avatar.png" type="url" className="max-w-xs" />
            <AvatarPreview url={avatarUrl} />
          </Field>
        </div>
      </div>

      {/* Save button + error */}
      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={() => void handleSave()} disabled={!dirty || saving || !!usernameError} loading={saving}>
          {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Changes saved
          </span>
        )}
        {saveError && !isUsernameConflict && <p className="text-xs text-danger">{saveError.message}</p>}
      </div>

      {/* Linked providers */}
      {linkedProviders.length > 0 && (
        <div className="border-t border-border pt-6">
          <p className="mb-2 text-sm font-medium text-text-primary">Linked providers</p>
          <p className="mb-3 text-xs text-text-muted">OAuth providers connected to your account. Provider linking is managed automatically at sign-in.</p>
          <div className="flex flex-wrap gap-2">
            {linkedProviders.map((p) => (
              <ProviderBadge key={p} provider={p} />
            ))}
          </div>
        </div>
      )}

      {/* Email (read-only) */}
      <div className="flex items-start justify-between gap-4 border-t border-border pt-6">
        <div>
          <p className="text-sm font-medium text-text-primary">Email address</p>
          <p className="mt-0.5 text-xs text-text-muted">Used for notifications and login. Cannot be changed.</p>
        </div>
        <span className="shrink-0 font-mono text-sm text-text-muted">{user?.email}</span>
      </div>
    </div>
  );
}

function AvatarImageOrFallback({ avatarUrl, name, userId }: { avatarUrl: string; name?: string; userId: string }) {
  const [imgValid, setImgValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!avatarUrl) {
      setImgValid(null);
      return;
    }
    const img = new Image();
    img.onload = () => setImgValid(true);
    img.onerror = () => setImgValid(false);
    img.src = avatarUrl;
  }, [avatarUrl]);

  if (avatarUrl && imgValid === true) {
    return <img src={avatarUrl} alt={name ?? "Avatar"} className="h-12 w-12 rounded-full object-cover ring-1 ring-border" />;
  }

  return <Avatar name={name} color={deriveIconColor(userId)} size="lg" />;
}
