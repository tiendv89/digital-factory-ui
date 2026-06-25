"use client";

import { notFound } from "next/navigation";

import { useSession } from "@/components/auth";
import { getMeData } from "@/services/user-service";
import { isPlatformAdmin } from "@/utils/platform-role";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session } = useSession();

  if (session.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  const meData = session.status === "authenticated" ? getMeData(session.data) : null;

  if (session.status !== "authenticated" || !isPlatformAdmin(meData)) {
    notFound();
  }

  return (
    <div data-admin-layout className="flex h-full min-h-screen">
      <aside aria-label="Admin navigation" className="flex w-52 shrink-0 flex-col border-r border-border bg-surface py-4">
        <div className="mb-3 flex items-center gap-2 px-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Admin</span>
        </div>
        <nav aria-label="Admin sections">
          <AdminNavLink href="/admin/plans">Plans</AdminNavLink>
          <AdminNavLink href="/admin/users">Users</AdminNavLink>
          <AdminNavLink href="/admin/orgs">Orgs</AdminNavLink>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}

function AdminNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="flex w-full items-center gap-2.5 border-l-2 border-transparent px-4 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-nav-item-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
    >
      {children}
    </a>
  );
}
