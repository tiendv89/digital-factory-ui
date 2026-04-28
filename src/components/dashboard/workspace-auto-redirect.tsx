"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/context/workspace-context";

export function WorkspaceAutoRedirect() {
  const { activeWorkspaceId } = useWorkspace();
  const router = useRouter();

  useEffect(() => {
    if (activeWorkspaceId) {
      router.replace(`/?workspace=${encodeURIComponent(activeWorkspaceId)}`);
    }
  }, [activeWorkspaceId, router]);

  return null;
}
