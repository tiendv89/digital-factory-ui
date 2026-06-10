import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type OrgWorkspaceStoreState = {
  selectedOrgSlug: string | null;
  selectedWorkspaceId: string | null;
  setSelectedOrg: (orgSlug: string) => void;
  setSelectedWorkspace: (workspaceId: string, orgSlug?: string) => void;
};

export const useOrgWorkspaceStore = create<OrgWorkspaceStoreState>()(
  persist(
    (set) => ({
      selectedOrgSlug: null,
      selectedWorkspaceId: null,
      setSelectedOrg: (orgSlug) => set({ selectedOrgSlug: orgSlug, selectedWorkspaceId: null }),
      setSelectedWorkspace: (workspaceId, orgSlug) =>
        set((state) => ({
          selectedWorkspaceId: workspaceId,
          selectedOrgSlug: orgSlug ?? state.selectedOrgSlug,
        })),
    }),
    {
      name: "dashboard:org-workspace",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
