"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/features/auth";
import { EmptyState } from "@/features/workspaces/components/EmptyState";

export default function RootPage() {
  const router = useRouter();
  const { session } = useSession();

  useEffect(() => {
    if (session.status !== "authenticated") return;
    if ((session.data.data.accessible_workspace_ids ?? []).length > 0) {
      router.replace("/board");
    }
  }, [router, session]);

  if (session.status === "loading") {
    return null;
  }

  if (
    session.status === "authenticated" &&
    (session.data.data.accessible_workspace_ids ?? []).length === 0
  ) {
    return <EmptyState />;
  }

  return null;
}
