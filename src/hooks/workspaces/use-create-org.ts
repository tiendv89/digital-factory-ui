"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { CreateOrgRequest, Org } from "@/services/user-service";
import { createOrg } from "@/services/user-service";

export function useCreateOrg() {
  const queryClient = useQueryClient();
  return useMutation<Org, Error, CreateOrgRequest>({
    mutationFn: (body) => createOrg(body),
    onSuccess: () => {
      // Invalidate /api/me so memberships refresh with the new org.
      void queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}
