"use client";

import { usePathname } from "next/navigation";

import { useSession } from "@/components/auth";

export function SessionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session } = useSession();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (session.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (session.status === "unauthenticated") {
    return null;
  }

  return <>{children}</>;
}
