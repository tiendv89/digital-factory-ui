"use client";

import { useState } from "react";
import { Users, Settings, AlertTriangle, Loader2, AlertCircle, Info } from "lucide-react";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import { useOrgWorkspaceSelection } from "@/features/workspaces/hooks/useOrgWorkspaceSelection";
import {
  useWorkspaceMembers,
  useWorkspaceInvitations,
  useInviteMember,
  useRemoveMember,
  useCancelInvitation,
} from "@/features/admin/hooks/useAdminMembers";
import { useChangeOrgMemberRole } from "@/features/workspaces/hooks/useWorkspaceSettings";
import type { Member, Invitation } from "@/services/user-service";

// ─── Types ──────────────────────────────────────────────────────────────────

type TabId = "members" | "general" | "danger-zone";

// ─── MembersTab ──────────────────────────────────────────────────────────────

function RoleSelect({
  current,
  userId,
  orgId,
  workspaceId,
}: {
  current: string;
  userId: string;
  orgId: string;
  workspaceId: string;
}) {
  const mutation = useChangeOrgMemberRole(orgId, workspaceId);
  const [localRole, setLocalRole] = useState(current);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as "member" | "admin";
    setLocalRole(newRole);
    mutation.mutate(
      { userId, role: newRole },
      {
        onError: () => setLocalRole(current),
      },
    );
  }

  return (
    <select
      value={localRole}
      onChange={handleChange}
      disabled={mutation.isPending}
      aria-label="Change member role"
      className="rounded border border-border bg-surface-secondary px-2 py-1 text-xs text-text-primary outline-none transition-colors hover:border-primary focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-wait disabled:opacity-60"
      data-role-select={userId}
    >
      <option value="member">Member</option>
      <option value="admin">Admin</option>
    </select>
  );
}

function MembersTable({
  workspaceId,
  orgId,
  members,
  loading,
  error,
}: {
  workspaceId: string;
  orgId: string;
  members: Member[];
  loading: boolean;
  error: Error | null;
}) {
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null);
  const removeMutation = useRemoveMember(workspaceId);
  const member = members.find((m) => m.user_id === confirmUserId);

  function handleOpenConfirm(userId: string) {
    removeMutation.reset();
    setConfirmUserId(userId);
  }

  function handleConfirmRemove() {
    if (!confirmUserId) return;
    removeMutation.mutate(confirmUserId, {
      onSuccess: () => setConfirmUserId(null),
    });
  }

  return (
    <section
      aria-labelledby="ws-members-heading"
      className="rounded-lg border border-border bg-surface"
      data-ws-members-table
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3
          id="ws-members-heading"
          className="text-xs font-semibold uppercase tracking-wider text-text-muted"
        >
          Members
        </h3>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" aria-hidden />}
      </div>

      {/* Role note */}
      <div className="flex items-start gap-2 border-b border-border bg-surface-secondary px-4 py-2.5">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden />
        <p className="text-xs text-text-muted">
          Roles are org-level — changing a member&apos;s role here updates their
          organisation membership.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          <span className="text-sm">Failed to load members: {error.message}</span>
        </div>
      )}

      {!error && (
        <div className="divide-y divide-border">
          {members.length === 0 && !loading ? (
            <p className="px-4 py-6 text-center text-sm text-text-muted">
              No members found.
            </p>
          ) : (
            members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center gap-3 px-4 py-3"
                data-member-row={m.user_id}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {m.display_name ?? m.email}
                  </p>
                  {m.display_name && (
                    <p className="text-xs text-text-muted truncate">{m.email}</p>
                  )}
                </div>

                {orgId ? (
                  <RoleSelect
                    current={m.role}
                    userId={m.user_id}
                    orgId={orgId}
                    workspaceId={workspaceId}
                  />
                ) : (
                  <span className="rounded border border-border bg-chip-bg px-2 py-0.5 text-xs font-medium text-text-secondary capitalize">
                    {m.role}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenConfirm(m.user_id)}
                  className="rounded border border-danger/40 px-2.5 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                  aria-label={`Remove ${m.display_name ?? m.email} from workspace`}
                  data-remove-member={m.user_id}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Inline remove confirm */}
      {confirmUserId && member && (
        <div
          className="border-t border-border bg-danger/5 px-4 py-3"
          role="alertdialog"
          aria-labelledby="confirm-remove-heading"
          data-confirm-remove
        >
          <p
            id="confirm-remove-heading"
            className="text-sm font-medium text-text-primary"
          >
            Remove {member.display_name ?? member.email}?
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            They will lose access to this workspace immediately.
          </p>
          {removeMutation.isError && (
            <p className="mt-2 text-xs text-danger">
              {removeMutation.error?.message ?? "Failed to remove member."}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmUserId(null)}
              className="rounded border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmRemove}
              disabled={removeMutation.isPending}
              className="rounded bg-danger px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
              data-confirm-remove-btn
            >
              {removeMutation.isPending ? "Removing…" : "Remove"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function InviteForm({ workspaceId }: { workspaceId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const inviteMutation = useInviteMember(workspaceId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    inviteMutation.mutate(
      { email: trimmed, role },
      {
        onSuccess: () => {
          setEmail("");
          setRole("member");
        },
      },
    );
  }

  return (
    <section
      aria-labelledby="ws-invite-heading"
      className="rounded-lg border border-border bg-surface"
      data-ws-invite-form
    >
      <div className="border-b border-border px-4 py-3">
        <h3
          id="ws-invite-heading"
          className="text-xs font-semibold uppercase tracking-wider text-text-muted"
        >
          Invite member
        </h3>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
        {inviteMutation.isError && (
          <p className="text-xs text-danger" role="alert">
            {inviteMutation.error?.message ?? "Failed to send invite."}
          </p>
        )}
        {inviteMutation.isSuccess && (
          <p className="text-xs text-success" role="status">
            Invitation sent.
          </p>
        )}
        <div className="flex gap-2">
          <div className="flex-1">
            <label
              htmlFor="ws-invite-email"
              className="mb-1 block text-xs font-medium text-text-secondary"
            >
              Email address
            </label>
            <input
              id="ws-invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full rounded border border-border bg-surface-secondary px-3 py-1.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
              data-invite-email-input
            />
          </div>
          <div>
            <label
              htmlFor="ws-invite-role"
              className="mb-1 block text-xs font-medium text-text-secondary"
            >
              Role
            </label>
            <select
              id="ws-invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "member" | "admin")}
              className="rounded border border-border bg-surface-secondary px-2 py-1.5 text-sm text-text-primary outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              data-invite-role-select
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={inviteMutation.isPending || !email.trim()}
            className="rounded border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            data-invite-submit
          >
            {inviteMutation.isPending ? "Sending…" : "Send invite"}
          </button>
        </div>
      </form>
    </section>
  );
}

function InvitationsTable({
  workspaceId,
  invitations,
  loading,
  error,
}: {
  workspaceId: string;
  invitations: Invitation[];
  loading: boolean;
  error: Error | null;
}) {
  const cancelMutation = useCancelInvitation(workspaceId);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const invitation = invitations.find((inv) => inv.id === confirmId);

  function handleConfirmCancel() {
    if (!confirmId) return;
    cancelMutation.mutate(confirmId, {
      onSuccess: () => setConfirmId(null),
    });
  }

  function formatExpiry(iso: string) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  }

  if (!loading && invitations.length === 0 && !error) return null;

  return (
    <section
      aria-labelledby="ws-invitations-heading"
      className="rounded-lg border border-border bg-surface"
      data-ws-invitations-table
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3
          id="ws-invitations-heading"
          className="text-xs font-semibold uppercase tracking-wider text-text-muted"
        >
          Pending invitations
        </h3>
        {loading && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" aria-hidden />
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          <span className="text-sm">Failed to load invitations: {error.message}</span>
        </div>
      )}

      {!error && (
        <div className="divide-y divide-border">
          {invitations.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center gap-3 px-4 py-3"
              data-invitation-row={inv.id}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{inv.email}</p>
                <p className="text-xs text-text-muted">
                  Expires {formatExpiry(inv.expires_at)}
                </p>
              </div>
              <span className="rounded border border-border bg-chip-bg px-2 py-0.5 text-xs font-medium text-text-secondary capitalize">
                {inv.role}
              </span>
              <button
                type="button"
                onClick={() => {
                  cancelMutation.reset();
                  setConfirmId(inv.id);
                }}
                className="rounded border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`Cancel invitation for ${inv.email}`}
                data-cancel-invitation={inv.id}
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}

      {confirmId && invitation && (
        <div
          className="border-t border-border bg-surface-secondary px-4 py-3"
          role="alertdialog"
          aria-labelledby="confirm-cancel-heading"
          data-confirm-cancel
        >
          <p id="confirm-cancel-heading" className="text-sm font-medium text-text-primary">
            Cancel invitation for {invitation.email}?
          </p>
          {cancelMutation.isError && (
            <p className="mt-1 text-xs text-danger">
              {cancelMutation.error?.message ?? "Failed to cancel."}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmId(null)}
              className="rounded border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Keep
            </button>
            <button
              type="button"
              onClick={handleConfirmCancel}
              disabled={cancelMutation.isPending}
              className="rounded border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
              data-confirm-cancel-btn
            >
              {cancelMutation.isPending ? "Cancelling…" : "Cancel invitation"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function MembersTab({
  workspaceId,
  orgId,
}: {
  workspaceId: string;
  orgId: string;
}) {
  const membersQuery = useWorkspaceMembers(workspaceId);
  const invitationsQuery = useWorkspaceInvitations(workspaceId);

  if (membersQuery.loading && invitationsQuery.loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span className="text-sm">Loading members…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-ws-members-tab>
      <MembersTable
        workspaceId={workspaceId}
        orgId={orgId}
        members={membersQuery.members}
        loading={membersQuery.loading}
        error={membersQuery.error}
      />
      <InviteForm workspaceId={workspaceId} />
      <InvitationsTable
        workspaceId={workspaceId}
        invitations={invitationsQuery.invitations}
        loading={invitationsQuery.loading}
        error={invitationsQuery.error}
      />
    </div>
  );
}

// ─── GeneralTab ──────────────────────────────────────────────────────────────

function GeneralTab() {
  return (
    <div className="space-y-4" data-ws-general-tab>
      <section aria-labelledby="ws-general-heading">
        <h3
          id="ws-general-heading"
          className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted"
        >
          General
        </h3>
        <div className="rounded-lg border border-border bg-surface p-6 text-center">
          <Settings className="mx-auto mb-3 h-8 w-8 text-text-muted" aria-hidden />
          <p className="text-sm font-semibold text-text-primary">
            Workspace general settings
          </p>
          <p className="mt-1.5 text-xs text-text-muted">
            Rename and configure workspace identity. Managed via import/sync
            (Decision D2 — pending a future workflow-backend slice).
          </p>
          <span
            className="mt-4 inline-block rounded border border-border bg-chip-bg px-2.5 py-1 text-xs text-text-muted"
            data-placeholder-badge
          >
            Managed via import/sync
          </span>
        </div>
      </section>
    </div>
  );
}

// ─── DangerZoneTab ───────────────────────────────────────────────────────────

function DangerZoneTab() {
  return (
    <div className="space-y-4" data-ws-danger-tab>
      <section aria-labelledby="ws-danger-heading">
        <h3
          id="ws-danger-heading"
          className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-danger"
        >
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          Danger zone
        </h3>
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-danger/60" aria-hidden />
          <p className="text-sm font-semibold text-text-primary">
            Workspace deletion and transfer
          </p>
          <p className="mt-1.5 text-xs text-text-muted">
            Delete or transfer this workspace. Managed via import/sync
            (Decision D2 — pending a future workflow-backend slice).
          </p>
          <span
            className="mt-4 inline-block rounded border border-danger/30 bg-danger/5 px-2.5 py-1 text-xs text-danger/80"
            data-placeholder-badge
          >
            Managed via import/sync
          </span>
        </div>
      </section>
    </div>
  );
}

// ─── WorkspaceSettingsPage ────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }> }[] = [
  { id: "members", label: "Members", icon: Users },
  { id: "general", label: "General", icon: Settings },
  { id: "danger-zone", label: "Danger zone", icon: AlertTriangle },
];

export function WorkspaceSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("members");
  const { selectedWorkspaceId } = useWorkspaceContext();
  const { activeMembership } = useOrgWorkspaceSelection();

  const workspaceId = selectedWorkspaceId;
  const orgId = activeMembership?.organization_id ?? "";

  if (!workspaceId) {
    return (
      <div
        className="flex items-center justify-center py-16 text-text-muted"
        data-ws-settings-no-workspace
      >
        <p className="text-sm">No workspace selected.</p>
      </div>
    );
  }

  return (
    <div
      data-workspace-settings-page
      className="space-y-4"
    >
      {/* Tab bar */}
      <nav
        role="tablist"
        aria-label="Workspace settings sections"
        className="flex gap-1 border-b border-border"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
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
                "-mb-px flex items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary " +
                (isActive
                  ? "border-primary text-text-primary"
                  : "border-transparent text-text-muted hover:text-text-secondary")
              }
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Tab panel */}
      <div
        id={`ws-settings-panel-${activeTab}`}
        role="tabpanel"
        aria-label={TABS.find((t) => t.id === activeTab)?.label}
      >
        {activeTab === "members" && (
          <MembersTab workspaceId={workspaceId} orgId={orgId} />
        )}
        {activeTab === "general" && <GeneralTab />}
        {activeTab === "danger-zone" && <DangerZoneTab />}
      </div>
    </div>
  );
}
