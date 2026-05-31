"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useSession } from "@/features/auth";
import type { MeMembership } from "@/services/user-service";

export type OrgWorkspaceSelection = {
  memberships: MeMembership[];
  activeMembership: MeMembership | null;
  accessibleWorkspaceIds: string[];
  isLoading: boolean;
  isEmpty: boolean;
  switchOrg: (orgSlug: string) => void;
  switchWorkspace: (workspaceId: string) => void;
  activeWorkspaceId: string | null;
};

export function useOrgWorkspaceSelection(): OrgWorkspaceSelection {
  const { session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const isLoading = session.status === "loading";

  const memberships = useMemo<MeMembership[]>(
    () =>
      session.status === "authenticated"
        ? (session.data?.memberships ?? [])
        : [],
    [session],
  );

  const accessibleWorkspaceIds = useMemo<string[]>(
    () =>
      session.status === "authenticated"
        ? (session.data?.accessible_workspace_ids ?? [])
        : [],
    [session],
  );

  const orgSlug = searchParams.get("org");
  const wsId = searchParams.get("ws");

  const activeMembership = useMemo<MeMembership | null>(() => {
    if (memberships.length === 0) return null;
    if (orgSlug) {
      return (
        memberships.find((m) => m.organization_slug === orgSlug) ??
        memberships[0]
      );
    }
    return memberships[0];
  }, [memberships, orgSlug]);

  const activeWorkspaceId = useMemo<string | null>(() => {
    if (accessibleWorkspaceIds.length === 0) return null;
    if (wsId && accessibleWorkspaceIds.includes(wsId)) return wsId;
    return accessibleWorkspaceIds[0];
  }, [accessibleWorkspaceIds, wsId]);

  const switchOrg = useCallback(
    (newOrgSlug: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("org", newOrgSlug);
      params.delete("ws");
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname],
  );

  const switchWorkspace = useCallback(
    (workspaceId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("ws", workspaceId);
      if (activeMembership) {
        params.set("org", activeMembership.organization_slug);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname, activeMembership],
  );

  return {
    memberships,
    activeMembership,
    accessibleWorkspaceIds,
    isLoading,
    isEmpty: !isLoading && memberships.length === 0,
    switchOrg,
    switchWorkspace,
    activeWorkspaceId,
  };
}
