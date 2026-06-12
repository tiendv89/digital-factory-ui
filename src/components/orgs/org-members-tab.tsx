"use client";

import { Popover } from "@heroui/react";
import { AlertCircle, Loader2, MoreHorizontal, UserPlus } from "lucide-react";
import { useState } from "react";

import { Avatar } from "@/components/common";
import { useCancelOrgInvitation, useChangeOrgMemberRole, useInviteOrgMember, useOrgInvitations, useOrgMembers, useRemoveOrgMember } from "@/hooks/admin/use-org-settings";
import type { OrgMember, OrgRole } from "@/services/user-service";

import { deriveIconColor } from "../settings/icon-colors";

interface OrgMembersTabProps {
  orgId: string;
  currentUserId: string;
  userRole: OrgRole;
}

const ROLE_STYLE: Record<string, { label: string; className: string }> = {
  admin: { label: "Admin", className: "bg-blue-500/20 text-blue-400" },
  member: { label: "Member", className: "bg-white/8 text-[#9d9d9d]" },
};

function RoleBadge({ role }: { role: string }) {
  const def = ROLE_STYLE[role] ?? ROLE_STYLE.member;
  return <span className={`inline-flex shrink-0 items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${def.className}`}>{def.label}</span>;
}

function MemberMenu({ member, orgId }: { member: OrgMember; orgId: string }) {
  const changeRole = useChangeOrgMemberRole(orgId);
  const removeMember = useRemoveOrgMember(orgId);
  const [open, setOpen] = useState(false);

  const busy = changeRole.isPending || removeMember.isPending;

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <button
          type="button"
          disabled={busy}
          className="flex h-7 w-7 items-center justify-center rounded text-[#666] transition-colors hover:bg-white/8 hover:text-[#ccc] disabled:opacity-40"
          aria-label="Member actions"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <MoreHorizontal className="h-4 w-4" aria-hidden />}
        </button>
      </Popover.Trigger>
      <Popover.Content placement="bottom end" className="p-0 overflow-hidden rounded-lg border shadow-xl" style={{ backgroundColor: "#2d2d2d", borderColor: "#454545", minWidth: 168 }}>
        <Popover.Dialog className="p-0 outline-none flex flex-col py-1">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void changeRole.mutateAsync({ userId: member.user_id, body: { role: member.role === "admin" ? "member" : "admin" } });
            }}
            className="flex w-full items-center px-3 py-2 text-left text-sm text-[#ccc] transition-colors hover:bg-white/5 hover:text-white"
          >
            {member.role === "admin" ? "Demote to member" : "Promote to admin"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void removeMember.mutateAsync(member.user_id);
            }}
            className="flex w-full items-center px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-bg"
          >
            Remove member
          </button>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

function MemberRow({ member, isCurrentUser, canEdit, orgId }: { member: OrgMember; isCurrentUser: boolean; canEdit: boolean; orgId: string }) {
  const showMenu = canEdit;

  return (
    <div className="flex items-center gap-3 border-b py-3 last:border-b-0" style={{ borderColor: "#2e2e2e" }} data-member-row={member.user_id}>
      <Avatar name={member.display_name ?? member.email} color={deriveIconColor(member.user_id)} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-text-primary">
          {member.display_name ?? member.email}
          {isCurrentUser && <span className="ml-1.5 text-[11px] font-normal text-text-muted">(you)</span>}
        </p>
        <p className="truncate font-mono text-xs text-text-muted">{member.email}</p>
      </div>
      <RoleBadge role={member.role} />
      {showMenu ? <MemberMenu member={member} orgId={orgId} /> : <div className="w-7 shrink-0" />}
    </div>
  );
}

export function OrgMembersTab({ orgId, currentUserId, userRole }: OrgMembersTabProps) {
  const { members, loading: membersLoading, error: membersError } = useOrgMembers(orgId);
  const { invitations, loading: invLoading, error: invError } = useOrgInvitations(orgId);
  const inviteOrgMember = useInviteOrgMember(orgId);
  const cancelInvitation = useCancelOrgInvitation(orgId);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  const canEdit = userRole === "admin";

  const handleInvite = async () => {
    setInviteError(null);
    if (!inviteEmail.trim()) {
      setInviteError("Email is required");
      return;
    }
    try {
      await inviteOrgMember.mutateAsync({ email: inviteEmail.trim(), role: "member" });
      setInviteEmail("");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite");
    }
  };

  return (
    <div className="space-y-4" data-org-members>
      {/* Invite bar */}
      {canEdit && (
        <div>
          <div className="flex items-center gap-2 rounded-[12px] border px-3 py-2" style={{ borderColor: "#3c3c3c", backgroundColor: "#1e1e1e" }}>
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
              placeholder="Invite member by email..."
              aria-label="Invite email address"
              className="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
            />
            <button
              type="button"
              onClick={() => void handleInvite()}
              disabled={inviteOrgMember.isPending}
              className="shrink-0 rounded-[8px] px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-white/8 hover:text-text-primary disabled:opacity-40"
              style={{ backgroundColor: "#3a3a3a" }}
            >
              {inviteOrgMember.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : "Invite"}
            </button>
          </div>
          {inviteError && (
            <p className="mt-1.5 text-xs text-danger" role="alert">
              {inviteError}
            </p>
          )}
        </div>
      )}

      {/* Members list */}
      {membersLoading ? (
        <div className="flex items-center gap-2 py-6 text-text-muted" data-members-loading>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span className="text-sm">Loading members…</span>
        </div>
      ) : membersError ? (
        <div className="flex items-center gap-2 py-4 text-danger" data-members-error>
          <AlertCircle className="h-4 w-4" aria-hidden />
          <span className="text-sm">{membersError.message}</span>
        </div>
      ) : (
        <div data-members-list>
          {members.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">No members yet.</p>
          ) : (
            members.map((m) => <MemberRow key={m.user_id} member={m} isCurrentUser={m.user_id === currentUserId} canEdit={canEdit} orgId={orgId} />)
          )}
        </div>
      )}

      {/* Pending invitations */}
      {(invitations.length > 0 || (canEdit && !invLoading)) && (
        <section aria-labelledby="org-invitations-heading" className="pt-2">
          <h3 id="org-invitations-heading" className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
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
            <div data-invitations-list>
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 border-b py-3 last:border-b-0" style={{ borderColor: "#2e2e2e" }} data-invitation-row={inv.id}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-text-primary">{inv.email}</p>
                    <p className="text-xs text-text-muted">Expires {new Date(inv.expires_at).toLocaleDateString()}</p>
                  </div>
                  <RoleBadge role={inv.role} />
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => void cancelInvitation.mutateAsync(inv.id)}
                      disabled={cancelInvitation.isPending}
                      className="shrink-0 text-xs text-text-muted underline-offset-2 transition-colors hover:text-danger disabled:opacity-40"
                      aria-label={`Cancel invitation for ${inv.email}`}
                    >
                      Cancel
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
