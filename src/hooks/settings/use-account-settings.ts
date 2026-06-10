"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MeData, UpdateMeRequest } from "@/services/user-service";
import { fetchMe, getMeData, updateMe } from "@/services/user-service";

const settingsKeys = {
  me: () => ["settings", "me"] as const,
};

export function useAccountSettings() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<MeData, Error>({
    queryKey: settingsKeys.me(),
    queryFn: () => fetchMe().then((r) => getMeData(r)),
    staleTime: 60_000,
  });

  const mutation = useMutation<MeData, Error, UpdateMeRequest>({
    mutationFn: (body) => updateMe(body).then((r) => getMeData(r)),
    onSuccess: (updated) => {
      queryClient.setQueryData(settingsKeys.me(), updated);
    },
  });

  return {
    meData: data ?? null,
    loading: isLoading,
    error: error ?? null,
    saving: mutation.isPending,
    saveError: mutation.error ?? null,
    updateDisplayName: (name: string | null) => mutation.mutateAsync({ display_name: name }),
  };
}
