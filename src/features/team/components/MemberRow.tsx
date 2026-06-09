"use client";

import type { TeamMember } from "../hooks/useTeamMembers";

function Avatar({ name, email }: { name: string | null; email: string }) {
  const label = name ?? email;
  const initial = label.charAt(0).toUpperCase();
  return (
    <div
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-muted text-xs font-semibold text-accent"
    >
      {initial}
    </div>
  );
}

export function MemberRow({ member }: { member: TeamMember }) {
  const displayName = member.display_name ?? member.email;

  return (
    <div
      data-member-row
      className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 hover:bg-surface-subtle"
    >
      <Avatar name={member.display_name} email={member.email} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">
          {displayName}
        </p>
        {member.display_name && (
          <p className="truncate text-xs text-text-muted">{member.email}</p>
        )}
      </div>

      <span className="shrink-0 rounded-full border border-border bg-chip-bg px-2 py-0.5 text-xs font-medium capitalize text-text-secondary">
        {member.role}
      </span>

      <div
        data-workload-placeholder
        className="flex w-32 shrink-0 flex-col items-end gap-0.5"
        title="Workload data not yet available"
      >
        <div className="flex w-full items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
            <div className="h-full w-0 rounded-full bg-accent-muted" />
          </div>
          <span className="w-7 text-right text-xs text-text-muted">—</span>
        </div>
        <span className="text-[10px] leading-none text-text-muted">
          Workload (placeholder)
        </span>
      </div>

      <div
        data-status-placeholder
        className="flex w-24 shrink-0 flex-col items-end gap-0.5"
        title="Activity status not yet available"
      >
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-chip-bg px-2 py-0.5 text-xs text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-border" aria-hidden />
          Idle
        </span>
        <span className="text-[10px] leading-none text-text-muted">
          Status (placeholder)
        </span>
      </div>
    </div>
  );
}
