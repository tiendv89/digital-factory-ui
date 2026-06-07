"use client";

import { useState } from "react";
import { useWorkspaceContext } from "@/features/workspaces/context/WorkspaceContext";
import {
  useWorkspaceMembers,
  useWorkspaceInvitations,
  useInviteMember,
  useRemoveMember,
  useCancelInvitation,
} from "@/features/admin/hooks/useAdminMembers";
import type { Member, Invitation } from "@/services/user-service";

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  dangerous,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  dangerous?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-lg">
        <h3 className="mb-2 text-base font-semibold text-text-primary">
          {title}
        </h3>
        <p className="mb-6 text-sm text-text-secondary">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-subtle"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              dangerous
                ? "rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors bg-danger hover:opacity-90"
                : "rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors bg-primary hover:opacity-90"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">
      {message}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-8 text-center text-sm text-text-muted">{label}</div>
  );
}

function MembersTable({
  workspaceId,
  members,
  loading,
  error,
}: {
  workspaceId: string;
  members: Member[];
  loading: boolean;
  error: Error | null;
}) {
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null);
  const removeMutation = useRemoveMember(workspaceId);

  const member = members.find((m) => m.user_id === confirmUserId);

  function handleConfirmRemove() {
    if (!confirmUserId) return;
    removeMutation.mutate(confirmUserId, {
      onSuccess: () => setConfirmUserId(null),
      onError: () => setConfirmUserId(null),
    });
  }

  return (
    <section className="rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-text-primary">Members</h2>
        {loading && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
        )}
      </div>

      {error && (
        <div className="px-5 py-3">
          <ErrorMessage message={`Failed to load members: ${error.message}`} />
        </div>
      )}

      {!error && !loading && members.length === 0 && (
        <EmptyState label="No members found." />
      )}

      {members.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-subtle text-xs font-semibold uppercase tracking-wide text-text-muted">
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Role</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((m) => (
                <tr key={m.user_id} className="hover:bg-surface-subtle">
                  <td className="px-5 py-3 font-medium text-text-primary">
                    {m.display_name ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-text-secondary">{m.email}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full border border-border bg-chip-bg px-2 py-0.5 text-xs font-medium text-text-secondary capitalize">
                      {m.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setConfirmUserId(m.user_id)}
                      className="rounded-lg border border-danger/40 px-3 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger-bg"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmUserId && member && (
        <ConfirmDialog
          title="Remove member"
          message={`Remove ${member.display_name ?? member.email} from this workspace? They will lose access immediately.`}
          confirmLabel="Remove"
          onConfirm={handleConfirmRemove}
          onCancel={() => setConfirmUserId(null)}
          dangerous
        />
      )}
    </section>
  );
}

function InviteForm({ workspaceId }: { workspaceId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const inviteMutation = useInviteMember(workspaceId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    inviteMutation.mutate(
      { email: email.trim(), role },
      {
        onSuccess: () => {
          setEmail("");
          setRole("member");
        },
      },
    );
  }

  return (
    <section className="rounded-xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-text-primary">
          Invite a new member
        </h2>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4">
        {inviteMutation.isError && (
          <ErrorMessage
            message={`Failed to send invite: ${inviteMutation.error?.message}`}
          />
        )}
        {inviteMutation.isSuccess && (
          <div className="rounded-lg border border-success/30 bg-success-bg px-4 py-3 text-sm text-success">
            Invitation created successfully.
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="invite-email"
            className="text-xs font-medium text-text-secondary"
          >
            Email address
          </label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="invite-role"
            className="text-xs font-medium text-text-secondary"
          >
            Role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={inviteMutation.isPending || !email.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {inviteMutation.isPending ? "Sending…" : "Invite"}
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
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const cancelMutation = useCancelInvitation(workspaceId);

  const invitation = invitations.find((inv) => inv.id === confirmId);

  function handleConfirmCancel() {
    if (!confirmId) return;
    cancelMutation.mutate(confirmId, {
      onSuccess: () => setConfirmId(null),
      onError: () => setConfirmId(null),
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

  return (
    <section className="rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-text-primary">
          Pending invitations
        </h2>
        {loading && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
        )}
      </div>

      {error && (
        <div className="px-5 py-3">
          <ErrorMessage
            message={`Failed to load invitations: ${error.message}`}
          />
        </div>
      )}

      {!error && !loading && invitations.length === 0 && (
        <EmptyState label="No pending invitations." />
      )}

      {invitations.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-subtle text-xs font-semibold uppercase tracking-wide text-text-muted">
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Role</th>
                <th className="px-5 py-3 text-left">Expires</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-surface-subtle">
                  <td className="px-5 py-3 text-text-primary">{inv.email}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full border border-border bg-chip-bg px-2 py-0.5 text-xs font-medium text-text-secondary capitalize">
                      {inv.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-text-muted">
                    {formatExpiry(inv.expires_at)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setConfirmId(inv.id)}
                      className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-subtle hover:border-danger/40 hover:text-danger"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmId && invitation && (
        <ConfirmDialog
          title="Cancel invitation"
          message={`Cancel the invitation sent to ${invitation.email}? The invite link will no longer work.`}
          confirmLabel="Cancel invitation"
          onConfirm={handleConfirmCancel}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </section>
  );
}

export default function AdminMembersPage() {
  const { selectedWorkspaceId } = useWorkspaceContext();

  const membersQuery = useWorkspaceMembers(selectedWorkspaceId);
  const invitationsQuery = useWorkspaceInvitations(selectedWorkspaceId);

  if (!selectedWorkspaceId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-text-muted">
          No workspace selected. Please select a workspace first.
        </p>
      </div>
    );
  }

  if (membersQuery.loading && invitationsQuery.loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-text-primary">
          Members
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Manage workspace members and invitations.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <MembersTable
          workspaceId={selectedWorkspaceId}
          members={membersQuery.members}
          loading={membersQuery.loading}
          error={membersQuery.error}
        />

        <InviteForm workspaceId={selectedWorkspaceId} />

        <InvitationsTable
          workspaceId={selectedWorkspaceId}
          invitations={invitationsQuery.invitations}
          loading={invitationsQuery.loading}
          error={invitationsQuery.error}
        />
      </div>
    </div>
  );
}
