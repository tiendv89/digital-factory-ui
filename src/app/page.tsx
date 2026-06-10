"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSession } from "@/components/auth";
import { EmptyState } from "@/components/workspaces/empty-state";

export default function RootPage() {
  const router = useRouter();
  const { session } = useSession();

  useEffect(() => {
    if (session.status !== "authenticated") return;
    router.replace("/board");
  }, [router, session]);

  if (session.status === "loading") {
    return null;
  }

  const orgWorkspaceIds = session.status === "authenticated" ? session.data.data.org_workspace_ids : {};
  const hasWorkspaces = Object.values(orgWorkspaceIds).some((ids) => ids.length > 0);
  if (session.status === "authenticated" && !hasWorkspaces) {
    return <EmptyState />;
  }

  return null;
}
