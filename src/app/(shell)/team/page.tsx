"use client";

import { Users } from "lucide-react";

export default function TeamPage() {
  return (
    <div
      data-team-page
      className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <Users className="h-10 w-10 text-text-muted" aria-hidden />
      <div>
        <p className="text-sm font-semibold text-text-primary">Team</p>
        <p className="mt-1 text-xs text-text-muted">Agents and team roster will appear here.</p>
      </div>
    </div>
  );
}
