"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/context/workspace-context";

interface FeatureDetailWorkspaceBridgeProps {
  serverWorkspaceId?: string;
}

export function FeatureDetailWorkspaceBridge({
  serverWorkspaceId,
}: FeatureDetailWorkspaceBridgeProps) {
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
