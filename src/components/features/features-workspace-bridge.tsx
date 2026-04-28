"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/context/workspace-context";

interface FeaturesWorkspaceBridgeProps {
  serverWorkspaceId?: string;
}

/**
 * Syncs the client-side active workspace from localStorage into the URL.
 * When the workspace context changes, this navigates to the features URL
 * with the ?workspace= param set — enabling server-side data loading.
 */
export function FeaturesWorkspaceBridge({
  serverWorkspaceId,
}: FeaturesWorkspaceBridgeProps) {
  const { activeWorkspaceId } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!activeWorkspaceId) return;
    if (activeWorkspaceId === serverWorkspaceId) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("workspace", activeWorkspaceId);
    router.replace(`${pathname}?${params.toString()}`);
  }, [activeWorkspaceId, serverWorkspaceId, pathname, router, searchParams]);

  return null;
}
