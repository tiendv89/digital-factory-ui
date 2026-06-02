"use client";

import { notFound } from "next/navigation";
import { useSession } from "@/features/auth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = useSession();

  if (session.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (
    session.status !== "authenticated" ||
    !(session.data.memberships ?? []).some((m) => m.role === "platform_admin")
  ) {
    notFound();
  }

  return <>{children}</>;
}
