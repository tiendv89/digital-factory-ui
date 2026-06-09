"use client";

import { useState } from "react";
import {
  Loader2,
  AlertCircle,
  UserPlus,
  Trash2,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import {
  useOrgMembers,
  useOrgInvitations,
  useInviteOrgMember,
  useChangeOrgMemberRole,
  useRemoveOrgMember,
  useCancelOrgInvitation,
} from "@/features/admin/hooks/useOrgSettings";
import type { OrgRole, OrgMember } from "@/services/user-service";

interface OrgMembersTabProps {
  orgId: string;
  currentUserId: string;
  userRole: OrgRole;
}

function RoleBadge({ role }: { role: string }) {
  const color =
    role === "platform_admin"
      ? "text-purple border-purple/30 bg-purple-bg"
      : role === "admin"
        ? "text-primary border-primary/30 bg-primary-light"
        : "text-text-secondary border-border bg-chip-bg";
  return (
    <span
      className={`rounded border px-2 py-0.5 text-[10px] font-medium capitalize ${color}`}
    >
      {role === "platform_admin" ? "platform admin" : role}
    </span>
  );
}

function MemberRow({
  member,
  isCurrentUser,
  canEdit,
  orgId,
}: {
  member: OrgMember;
  isCurrentUser: boolean;
  canEdit: boolean;
  orgId: string;
}) {
  const changeRole = useChangeOrgMemberRole(orgId);
  const removeMember = useRemoveOrgMember(orgId);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const isPlatformAdmin = member.role === "platform_admin";
  const canChangeRole = canEdit && !isPlatformAdmin && !isCurrentUser;
  const canRemove = canEdit && !isCurrentUser;

  const handleRoleToggle = () => {
    const newRole = member.role === "admin" ? "member" : "admin";
    void changeRole.mutateAsync({ userId: member.user_id, body: { role: newRole } });
  };

  const handleRemove = () => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    void removeMember.mutateAsync(member.user_id).then(() => setConfirmRemove(false));
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3" data-member-row={member.user_id}>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-secondary">
        <User className="h-3.5 w-3.5 text-text-muted" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">
          {member.display_name ?? member.email}
          {isCurrentUser && (
            <span className="ml-1.5 text-[10px] text-text-muted">(you)</span>
          )}
        </p>
        <p className="truncate text-xs text-text-muted">{member.email}</p>
      </div>
      <RoleBadge role={member.role} />
      {canChangeRole && (
        <button
          type="button"
          title={member.role === "admin" ? "Demote to member" : "Promote to admin"}
          aria-label={
            member.role === "admin"
              ? `Demote ${member.email} to member`
              : `Promote ${member.email} to admin`
          }
          onClick={handleRoleToggle}
          disabled={changeRole.isPending}
          className="flex h-7 w-7 items-center justify-center rounded border border-border text-text-muted transition-colors hover:bg-nav-item-hover hover:text-text-primary disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {changeRole.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
      )}
      {canRemove && (
        <button
          type="button"
          title={confirmRemove ? "Click again to confirm removal" : "Remove member"}
          aria-label={
            confirmRemove
              ? `Confirm remove ${member.email}`
              : `Remove ${member.email}`
          }
          onClick={handleRemove}
          disabled={removeMember.isPending}
          className={
            "flex h-7 w-7 items-center justify-center rounded border border-border transition-colors disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
            (confirmRemove
              ? "border-danger/40 bg-danger-bg text-danger hover:bg-danger/20"
              : "text-text-muted hover:bg-nav-item-hover hover:text-danger")
          }
        >
          {removeMember.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
      )}
      {changeRole.error && (
        <p className="text-xs text-danger">{changeRole.error.message}</p>
      )}
    </div>
  );
}

export function OrgMembersTab({ orgId, currentUserId, userRole }: OrgMembersTabProps) {
  const { members, loading: membersLoading, error: membersError } = useOrgMembers(orgId);
  const { invitations, loading: invLoading, error: invError } = useOrgInvitations(orgId);
  const inviteOrgMember = useInviteOrgMember(orgId);
  const cancelInvitation = useCancelOrgInvitation(orgId);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviteError, setInviteError] = useState<string | null>(null);

  const canEdit = userRole === "admin" || userRole === "platform_admin";

  const handleInvite = async () => {
    setInviteError(null);
    if (!inviteEmail.trim()) {
      setInviteError("Email is required");
      return;
    }
    try {
      await inviteOrgMember.mutateAsync({ email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail("");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite");
    }
  };

  return (
    <div className="space-y-6" data-org-members>
      {/* Members list */}
      <section aria-labelledby="org-members-heading">
        <h3
          id="org-members-heading"
          className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted"
        >
          Members
        </h3>
        {membersLoading ? (
          <div className="flex items-center gap-2 py-4 text-text-muted" data-members-loading>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span className="text-sm">Loading members…</span>
          </div>
        ) : membersError ? (
          <div className="flex items-center gap-2 py-4 text-danger" data-members-error>
            <AlertCircle className="h-4 w-4" aria-hidden />
            <span className="text-sm">{membersError.message}</span>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-surface divide-y divide-border" data-members-list>
            {members.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">No members yet.</p>
            ) : (
              members.map((m) => (
                <MemberRow
                  key={m.user_id}
                  member={m}
                  isCurrentUser={m.user_id === currentUserId}
                  canEdit={canEdit}
                  orgId={orgId}
                />
              ))
            )}
          </div>
        )}
      </section>

      {/* Invite form — admin only */}
      {canEdit && (
        <section aria-labelledby="org-invite-heading">
          <h3
            id="org-invite-heading"
            className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted"
          >
            Invite member
          </h3>
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteError(null);
                }}
                placeholder="colleague@example.com"
                aria-label="Invite email address"
                className="flex-1 rounded border border-border bg-surface-secondary px-3 py-1.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "member" | "admin")}
                aria-label="Invite role"
                className="rounded border border-border bg-surface-secondary px-3 py-1.5 text-sm text-text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="button"
                onClick={() => void handleInvite()}
                disabled={inviteOrgMember.isPending}
                aria-label="Send invite"
                className="flex items-center gap-1.5 rounded border border-border bg-surface-secondary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-nav-item-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {inviteOrgMember.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" aria-hidden />
                )}
                Invite
              </button>
            </div>
            {inviteError && (
              <p className="mt-2 text-xs text-danger" role="alert">
                {inviteError}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Pending invitations */}
      {(invitations.length > 0 || (canEdit && !invLoading)) && (
        <section aria-labelledby="org-invitations-heading">
          <h3
            id="org-invitations-heading"
            className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted"
          >
            Pending invitations
          </h3>
          {invLoading ? (
            <div className="flex items-center gap-2 py-4 text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              <span className="text-sm">Loading…</span>
            </div>
          ) : invError ? (
            <div className="flex items-center gap-2 py-4 text-danger">
              <AlertCircle className="h-4 w-4" aria-hidden />
              <span className="text-sm">{invError.message}</span>
            </div>
          ) : invitations.length === 0 ? (
            <p className="text-sm text-text-muted">No pending invitations.</p>
          ) : (
            <div className="rounded-lg border border-border bg-surface divide-y divide-border" data-invitations-list>
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 px-4 py-3"
                  data-invitation-row={inv.id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text-primary">{inv.email}</p>
                    <p className="text-xs text-text-muted">
                      Expires {new Date(inv.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <RoleBadge role={inv.role} />
                  {canEdit && (
                    <button
                      type="button"
                      title="Cancel invitation"
                      aria-label={`Cancel invitation for ${inv.email}`}
                      onClick={() => void cancelInvitation.mutateAsync(inv.id)}
                      disabled={cancelInvitation.isPending}
                      className="flex h-7 w-7 items-center justify-center rounded border border-border text-text-muted transition-colors hover:bg-nav-item-hover hover:text-danger disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {cancelInvitation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <X className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
