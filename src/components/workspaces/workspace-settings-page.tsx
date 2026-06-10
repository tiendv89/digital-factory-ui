"use client";

import { AlertTriangle, Check, Copy, CreditCard, Loader2, MoreHorizontal, Settings, Shield, Trash2, UserPlus, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Avatar, Button, Field, Input } from "@/components/common";
import { deriveIconColor, ICON_COLORS } from "@/components/settings/icon-colors";
import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import { useCancelInvitation, useInviteMember, useRemoveMember, useWorkspaceInvitations, useWorkspaceMembers } from "@/hooks/admin/use-admin-members";
import { useOrgWorkspaceSelection } from "@/hooks/workspaces/use-org-workspace-selection";
import type { Member } from "@/services/user-service";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = "general" | "members" | "billing" | "danger-zone";

const WS_TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }> }[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "members", label: "Members", icon: Users },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "danger-zone", label: "Danger zone", icon: AlertTriangle },
];

// ─── Role badge ───────────────────────────────────────────────────────────────

const ROLE_STYLE: Record<string, { label: string; className: string }> = {
  platform_admin: { label: "Owner", className: "bg-amber-500/20 text-amber-400" },
  admin: { label: "Admin", className: "bg-blue-500/20 text-blue-400" },
  member: { label: "Member", className: "bg-white/8 text-[#9d9d9d]" },
  agent: { label: "Agent", className: "bg-blue-500/20 text-blue-400" },
};

function RoleBadge({ role }: { role: string }) {
  const def = ROLE_STYLE[role] ?? ROLE_STYLE.member;
  return <span className={`inline-flex shrink-0 items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${def.className}`}>{def.label}</span>;
}

// ─── Icon color localStorage helper ──────────────────────────────────────────

function useLocalIconColor(workspaceId: string, fallback: string) {
  const key = `ws-icon-color:${workspaceId}`;
  const [color, setColor] = useState<string>(() => {
    if (typeof window === "undefined") return fallback;
    return localStorage.getItem(key) ?? fallback;
  });
  const pick = (c: string) => {
    setColor(c);
    localStorage.setItem(key, c);
  };
  return [color, pick] as const;
}

// ─── General tab ─────────────────────────────────────────────────────────────

function GeneralTab({ workspaceId, name, slug }: { workspaceId: string; name: string; slug: string }) {
  const fallback = deriveIconColor(workspaceId);
  const [iconColor, setIconColor] = useLocalIconColor(workspaceId, fallback);
  const [displayName, setDisplayName] = useState(name);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(slug).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="space-y-6" data-ws-general>
      {/* Identity preview */}
      <div className="flex items-center gap-3">
        <Avatar name={displayName || name} color={iconColor} shape="square" size="lg" />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-text-primary">{displayName || name}</p>
          <p className="truncate font-mono text-xs text-text-muted">/{slug}</p>
        </div>
      </div>

      <Field label="Display name">
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={120} placeholder="Workspace name" aria-label="Display name" />
      </Field>

      <Field label="Icon color">
        <div className="flex flex-wrap gap-2">
          {ICON_COLORS.map((c) => {
            const selected = c === iconColor;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setIconColor(c)}
                aria-label={`Icon color ${c}`}
                aria-pressed={selected}
                className={`flex h-7 w-7 items-center justify-center rounded-[8px] transition-transform hover:scale-105 ${selected ? "ring-2 ring-white/80 ring-offset-2 ring-offset-surface" : ""}`}
                style={{ background: c }}
              >
                {selected && <Check className="h-3.5 w-3.5 text-white" aria-hidden />}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="URL slug">
        <div className="flex gap-2">
          <div className="flex flex-1 items-center rounded-[8px] border border-border-control bg-surface-secondary focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            <span className="px-3 text-sm text-text-muted">/</span>
            <input value={slug} readOnly aria-label="Workspace slug" className="h-9 w-full rounded-r-[8px] bg-transparent pr-3 font-mono text-sm text-text-primary outline-none" />
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-[8px] border border-border-control bg-surface-secondary px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-nav-item-hover hover:text-text-primary"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-primary" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </Field>

      <div className="flex justify-end">
        <Button variant="primary" aria-label="Save workspace general settings">
          Save changes
        </Button>
      </div>
    </div>
  );
}

// ─── Members tab ─────────────────────────────────────────────────────────────

function MemberMenu({ member, workspaceId }: { member: Member; workspaceId: string }) {
  const removeMember = useRemoveMember(workspaceId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={removeMember.isPending}
        className="flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary disabled:opacity-40 focus:outline-none"
        aria-label="Member options"
      >
        {removeMember.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <MoreHorizontal className="h-4 w-4" aria-hidden />}
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 min-w-[168px] overflow-hidden rounded-[8px] border border-border bg-surface py-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void removeMember.mutateAsync(member.user_id);
            }}
            className="flex w-full items-center px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-bg"
          >
            Remove from workspace
          </button>
        </div>
      )}
    </div>
  );
}

function MembersTab({ workspaceId }: { workspaceId: string }) {
  const { members, loading, error } = useWorkspaceMembers(workspaceId);
  const { invitations, loading: invLoading } = useWorkspaceInvitations(workspaceId);
  const inviteMutation = useInviteMember(workspaceId);
  const cancelInvitation = useCancelInvitation(workspaceId);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  const handleInvite = async () => {
    setInviteError(null);
    if (!inviteEmail.trim()) {
      setInviteError("Email is required");
      return;
    }
    try {
      await inviteMutation.mutateAsync({ email: inviteEmail.trim(), role: "member" });
      setInviteEmail("");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite");
    }
  };

  return (
    <div className="space-y-4" data-ws-members>
      {/* Invite bar */}
      <div>
        <div className="flex items-center gap-2 rounded-[8px] border border-border-control bg-surface-secondary px-3 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
          <UserPlus className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => {
              setInviteEmail(e.target.value);
              setInviteError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleInvite();
            }}
            placeholder="Invite by email..."
            className="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          <button
            type="button"
            onClick={() => void handleInvite()}
            disabled={inviteMutation.isPending}
            className="shrink-0 rounded-[6px] border border-border-control bg-surface px-3 py-1 text-sm font-medium text-text-secondary transition-colors hover:bg-nav-item-hover hover:text-text-primary disabled:opacity-40 focus:outline-none"
          >
            {inviteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : "Invite"}
          </button>
        </div>
        {inviteError && (
          <p className="mt-1.5 text-xs text-danger" role="alert">
            {inviteError}
          </p>
        )}
      </div>

      {/* Members list */}
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span className="text-sm">Loading members…</span>
        </div>
      ) : error ? (
        <p className="text-sm text-danger">{error.message}</p>
      ) : (
        <div>
          {members.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">No members yet.</p>
          ) : (
            members.map((m) => (
              <div key={m.user_id} className="flex items-center gap-3 border-b border-border py-3 last:border-b-0" data-member-row={m.user_id}>
                <Avatar name={m.display_name ?? m.email} color={deriveIconColor(m.user_id)} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-text-primary">{m.display_name ?? m.email}</p>
                  <p className="truncate font-mono text-xs text-text-muted">{m.display_name ? m.email : "—"}</p>
                </div>
                <RoleBadge role={m.role} />
                {m.role !== "platform_admin" ? <MemberMenu member={m} workspaceId={workspaceId} /> : <div className="w-7 shrink-0" />}
              </div>
            ))
          )}
        </div>
      )}

      {/* Pending invitations */}
      {(invitations.length > 0 || invLoading) && (
        <section aria-labelledby="ws-inv-heading" className="pt-2">
          <h3 id="ws-inv-heading" className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Pending invitations
          </h3>
          {invitations.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0" data-invitation-row={inv.id}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">{inv.email}</p>
                <p className="text-xs text-text-muted">Expires {new Date(inv.expires_at).toLocaleDateString()}</p>
              </div>
              <button
                type="button"
                onClick={() => void cancelInvitation.mutateAsync(inv.id)}
                disabled={cancelInvitation.isPending}
                className="text-xs text-text-muted underline-offset-2 transition-colors hover:text-danger disabled:opacity-40 focus:outline-none"
              >
                Cancel
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

// ─── Danger zone tab ─────────────────────────────────────────────────────────

function DangerZoneTab({ workspaceName, slug }: { workspaceName: string; slug: string }) {
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  return (
    <div className="space-y-4" data-ws-danger>
      {/* Delete workspace */}
      <section aria-labelledby="ws-delete-heading" className="rounded-[13px] border border-danger/40 bg-danger-bg/40 p-4" data-ws-delete-section>
        <h3 id="ws-delete-heading" className="mb-1 flex items-center gap-2 text-sm font-semibold text-danger">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          Delete workspace
        </h3>
        <p className="mb-4 text-xs leading-relaxed text-text-secondary">
          This permanently deletes <strong className="text-text-primary">{workspaceName}</strong> and all its features, tasks, and agent sessions. This action cannot be undone.
        </p>
        <div className="space-y-3">
          <div>
            <label htmlFor="ws-delete-confirm" className="mb-1.5 block text-xs text-text-secondary">
              Type <span className="font-mono font-semibold text-danger">{slug}</span> to confirm
            </label>
            <Input
              id="ws-delete-confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={slug}
              className="font-mono focus:border-danger focus:ring-danger"
            />
          </div>
          <Button variant="danger" disabled={deleteConfirmText !== slug} leftIcon={<Trash2 className="h-3.5 w-3.5" />} aria-label="Delete workspace permanently">
            Delete workspace
          </Button>
        </div>
      </section>

      {/* Transfer ownership */}
      <section aria-labelledby="ws-transfer-heading" className="rounded-[13px] border border-border bg-surface p-4">
        <h3 id="ws-transfer-heading" className="mb-1 flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Shield className="h-4 w-4 text-text-muted" aria-hidden />
          Transfer ownership
        </h3>
        <p className="mb-4 text-xs leading-relaxed text-text-secondary">Transfer this workspace to another member. You will be downgraded to admin.</p>
        <Button variant="secondary" aria-label="Transfer workspace ownership">
          Transfer ownership
        </Button>
      </section>
    </div>
  );
}

// ─── WorkspaceSettingsPage ────────────────────────────────────────────────────

export function WorkspaceSettingsPage({ workspaceId: propWorkspaceId, orgId: propOrgId }: { workspaceId?: string; orgId?: string } = {}) {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const { selectedWorkspaceId, summaries } = useWorkspaceContext();
  const { activeMembership } = useOrgWorkspaceSelection();

  const workspaceId = propWorkspaceId ?? selectedWorkspaceId;
  const orgId = propOrgId ?? activeMembership?.organization_id ?? "";

  const ws = useMemo(() => summaries.find((s) => s.id === workspaceId) ?? null, [summaries, workspaceId]);
  const name = ws?.name ?? "Workspace";
  const slug = ws?.slug ?? workspaceId ?? "";

  if (!workspaceId) {
    return <p className="py-8 text-center text-sm text-text-muted">No workspace selected.</p>;
  }

  const wsColor = deriveIconColor(workspaceId);

  return (
    <div className="flex min-h-0 flex-1" data-workspace-settings-page>
      {/* Sidebar */}
      <aside aria-label="Workspace settings navigation" className="flex w-52 shrink-0 flex-col border-r border-border p-3">
        {/* Workspace identity */}
        <div className="mb-3 flex items-center gap-2.5 px-1.5 py-1">
          <Avatar name={name} color={wsColor} shape="square" size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">{name}</p>
            <p className="truncate font-mono text-[11px] text-text-muted">/{slug}</p>
          </div>
        </div>

        <nav aria-label="Workspace settings sections" className="flex flex-col gap-0.5">
          {WS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDanger = tab.id === "danger-zone";
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`ws-settings-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                data-ws-settings-tab={tab.id}
                className={
                  "flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary " +
                  (isActive ? "bg-nav-item-active text-text-primary" : isDanger ? "text-danger hover:bg-surface-secondary" : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary")
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="flex-1 truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <main id={`ws-settings-panel-${activeTab}`} role="tabpanel" aria-label={WS_TABS.find((t) => t.id === activeTab)?.label} className="min-w-0 flex-1 overflow-y-auto p-6">
        {activeTab === "general" && <GeneralTab workspaceId={workspaceId} name={name} slug={slug} />}
        {activeTab === "members" && <MembersTab workspaceId={workspaceId} />}
        {activeTab === "danger-zone" && <DangerZoneTab workspaceName={name} slug={slug} />}
      </main>
    </div>
  );
}

// ─── WorkspaceSettingsModal ───────────────────────────────────────────────────

export function WorkspaceSettingsModal({ workspaceId, orgId, workspaceName, onClose }: { workspaceId: string; orgId: string; workspaceName: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Workspace settings" data-ws-settings-modal className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" onClick={onClose} />

      <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[13px] border border-border bg-surface shadow-[0_8px_20px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold text-text-primary">Workspace settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close workspace settings"
            className="rounded p-1 text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <WorkspaceSettingsPage workspaceId={workspaceId} orgId={orgId} />
        </div>
      </div>
    </div>
  );
}
