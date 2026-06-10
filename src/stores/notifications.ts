import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type NotificationsPrefs = {
  agentActivity: boolean;
  gateRequests: boolean;
  taskReviews: boolean;
  weeklyDigest: boolean;
};

type NotificationsState = NotificationsPrefs & {
  toggle: (key: keyof NotificationsPrefs) => void;
};

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      agentActivity: true,
      gateRequests: true,
      taskReviews: true,
      weeklyDigest: false,
      toggle: (key) => set((state) => ({ [key]: !state[key] })),
    }),
    {
      name: "workflow:notifications-prefs",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
