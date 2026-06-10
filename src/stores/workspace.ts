import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type LocalWorkspaceState = {
  selectedWorkspaceId: string | null;
  setSelectedWorkspaceId: (id: string | null) => void;
  lastVisitedFeatureId: string | null;
  setLastVisitedFeatureId: (id: string | null) => void;
};

export const useLocalWorkspaceStore = create<LocalWorkspaceState>()(
  persist(
    (set) => ({
      selectedWorkspaceId: null,
      setSelectedWorkspaceId: (id) => set({ selectedWorkspaceId: id }),
      lastVisitedFeatureId: null,
      setLastVisitedFeatureId: (id) => set({ lastVisitedFeatureId: id }),
    }),
    {
      name: "dashboard:local-workspace",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
