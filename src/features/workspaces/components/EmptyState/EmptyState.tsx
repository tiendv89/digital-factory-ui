"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { useSession } from "@/features/auth";

export function EmptyState() {
  const { session, logout } = useSession();

  const isPlatformAdmin =
    session.status === "authenticated" &&
    session.data.memberships.some((m) => m.role === "platform_admin");

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-bg px-4"
      data-testid="empty-state"
    >
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <p className="text-sm text-text-secondary">
          Your workspace will appear here as soon as your engagement is set up.
          If you expected to see something, contact your Kitelabs delivery lead.
        </p>

        {isPlatformAdmin && (
          <Link
            href="/admin/connect"
            className="rounded px-3 py-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            data-testid="empty-state-import-link"
          >
            Import workspace
          </Link>
        )}

        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-subtle hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          data-testid="empty-state-logout"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </main>
  );
}
