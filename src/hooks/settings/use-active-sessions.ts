"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ActiveSession } from "@/services/user-service";
import { listActiveSessions, logoutAllDevices, revokeSession } from "@/services/user-service";

const activeSessionsKey = ["settings", "active-sessions"] as const;

export function useActiveSessions() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<ActiveSession[], Error>({
    queryKey: activeSessionsKey,
    queryFn: listActiveSessions,
    staleTime: 30_000,
  });

  const revoke = useMutation<void, Error, string>({
    mutationFn: (id) => revokeSession(id),
    onSuccess: (_d, id) => {
      queryClient.setQueryData<ActiveSession[]>(activeSessionsKey, (prev) => (prev ?? []).filter((s) => s.id !== id));
    },
  });

  const logoutAll = useMutation<void, Error, void>({
    mutationFn: () => logoutAllDevices(),
  });

  return {
    sessions: data ?? [],
    loading: isLoading,
    error: error ?? null,
    revoke: (id: string) => revoke.mutateAsync(id),
    revokingId: revoke.isPending ? revoke.variables : null,
    logoutAll: () => logoutAll.mutateAsync(),
    loggingOutAll: logoutAll.isPending,
  };
}
