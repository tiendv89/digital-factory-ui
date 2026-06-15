"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useWorkspaceContext } from "@/components/workspaces/workspace-context";
import { useLocalWorkspaceStore } from "@/stores/workspace";

export default function FeaturePage() {
  const router = useRouter();
  const { activeWorkspace } = useWorkspaceContext();
  const lastVisitedFeatureId = useLocalWorkspaceStore((s) => s.lastVisitedFeatureId);

  useEffect(() => {
    const target = lastVisitedFeatureId ?? activeWorkspace?.features[0]?.id ?? null;

    if (target) {
      router.replace(`/feature/${target}`);
    } else if (activeWorkspace) {
      router.replace("/board");
    }
  }, [lastVisitedFeatureId, activeWorkspace, router]);

  return null;
}
