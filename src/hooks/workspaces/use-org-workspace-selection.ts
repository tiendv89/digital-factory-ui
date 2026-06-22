"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

import { useSession } from "@/components/auth";
import { getMeData, type MeMembership } from "@/services/user-service";
import { useOrgWorkspaceStore } from "@/stores/org-workspace";

export type OrgWorkspaceSelection = {
  memberships: MeMembership[];
  activeMembership: MeMembership | null;
  orgWorkspaceIds: Record<string, string[]>;
  isLoading: boolean;
  isEmpty: boolean;
  switchOrg: (orgSlug: string) => void;
  switchWorkspace: (workspaceId: string) => void;
  activeWorkspaceId: string | null;
};

export function useOrgWorkspaceSelection(): OrgWorkspaceSelection {
  const { session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { selectedOrgSlug, selectedWorkspaceId, setSelectedWorkspace } = useOrgWorkspaceStore();

  const isLoading = session.status === "loading";

  const sessionData = useMemo(() => (session.status === "authenticated" ? getMeData(session.data) : null), [session]);

  const memberships = useMemo<MeMembership[]>(() => sessionData?.memberships ?? [], [sessionData]);

  const orgWorkspaceIds = useMemo<Record<string, string[]>>(() => sessionData?.org_workspace_ids ?? {}, [sessionData]);

  useEffect(() => {
    const urlOrg = searchParams.get("org");
    const urlWs = searchParams.get("ws");
    if (!urlOrg && !urlWs) return;
    setSelectedWorkspace(urlWs ?? "", urlOrg ?? undefined);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("org");
    params.delete("ws");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, router, searchParams, setSelectedWorkspace]);

  const activeMembership = useMemo<MeMembership | null>(() => {
    if (memberships.length === 0) return null;
    if (selectedOrgSlug) {
      return memberships.find((m) => m.organization_slug === selectedOrgSlug) ?? memberships[0];
    }
    return memberships[0];
  }, [memberships, selectedOrgSlug]);

  const activeWorkspaceId = useMemo<string | null>(() => {
    if (selectedWorkspaceId) return selectedWorkspaceId;
    const orgIds = activeMembership ? (orgWorkspaceIds[activeMembership.organization_id] ?? []) : [];
    return orgIds[0] ?? null;
  }, [activeMembership, orgWorkspaceIds, selectedWorkspaceId]);

  const WORKSPACE_SCOPED = [/^\/feature\/[^/]+/, /^\/task\/[^/]+/];
  const isScopedToWorkspace = WORKSPACE_SCOPED.some((re) => re.test(pathname));

  const switchOrg = useCallback(
    (newOrgSlug: string) => {
      setSelectedWorkspace("", newOrgSlug);
      router.push(isScopedToWorkspace ? "/board" : pathname);
    },
    [setSelectedWorkspace, router, pathname, isScopedToWorkspace],
  );

  const switchWorkspace = useCallback(
    (workspaceId: string) => {
      setSelectedWorkspace(workspaceId, activeMembership?.organization_slug);
      router.push(isScopedToWorkspace ? "/board" : pathname);
    },
    [setSelectedWorkspace, router, pathname, activeMembership, isScopedToWorkspace],
  );

  return {
    memberships,
    activeMembership,
    orgWorkspaceIds,
    isLoading,
    isEmpty: !isLoading && memberships.length === 0,
    switchOrg,
    switchWorkspace,
    activeWorkspaceId,
  };
}
