"use client";

import { Building2, CreditCard, Shield, Users } from "lucide-react";
import Link from "next/link";
import { notFound, usePathname } from "next/navigation";

import { useSession } from "@/components/auth";
import { cn } from "@/components/common";
import { getMeData } from "@/services/user-service";
import { isPlatformAdmin } from "@/utils/platform-role";

const NAV = [
  { href: "/admin/plans", label: "Plans", icon: CreditCard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/orgs", label: "Orgs", icon: Building2 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const pathname = usePathname();

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
    <div data-admin-layout className="flex h-full overflow-hidden">
      {/* Sidebar — mirrors the settings nav */}
      <aside aria-label="Admin navigation" className="flex w-52 shrink-0 flex-col border-r border-border bg-surface py-4">
        <div className="mb-3 flex items-center gap-2 px-4">
          <Shield className="h-4 w-4 text-text-muted" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Admin</span>
        </div>
        <nav aria-label="Admin sections">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-2.5 border-l-2 px-4 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                  isActive ? "border-primary bg-surface-secondary font-medium text-text-primary" : "border-transparent text-text-secondary hover:bg-nav-item-hover hover:text-text-primary",
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-accent-foreground")} aria-hidden />
                <span className="flex-1 truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
