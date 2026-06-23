"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MeData, UpdateMeRequest } from "@/services/user-service";
import { fetchMe, getMeData, updateMe } from "@/services/user-service";

const profileKeys = {
  me: () => ["profile", "me"] as const,
};

export const USERNAME_REGEX = /^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$|^[a-z0-9]{3}$/;

export function validateUsername(value: string): string | null {
  if (value.length < 3) return "Username must be at least 3 characters.";
  if (value.length > 30) return "Username must be at most 30 characters.";
  if (!USERNAME_REGEX.test(value)) return "Only lowercase letters, numbers, hyphens, and underscores. Must start and end with a letter or number.";
  return null;
}

export function useProfileSettings() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<MeData, Error>({
    queryKey: profileKeys.me(),
    queryFn: () => fetchMe().then((r) => getMeData(r)),
    staleTime: 60_000,
  });

  const mutation = useMutation<MeData, Error & { status?: number }, UpdateMeRequest>({
    mutationFn: (body) => updateMe(body).then((r) => getMeData(r)),
    onSuccess: (updated) => {
      queryClient.setQueryData(profileKeys.me(), updated);
    },
  });

  return {
    meData: data ?? null,
    loading: isLoading,
    error: error ?? null,
    saving: mutation.isPending,
    saveError: mutation.error ?? null,
    updateProfile: (body: UpdateMeRequest) => mutation.mutateAsync(body),
    resetError: () => mutation.reset(),
  };
}
