"use client";

import { useMutation } from "@tanstack/react-query";

import { useSession } from "@/components/auth";
import { refreshBffSession } from "@/constants/axios";
import type { CreateOrgRequest, Org } from "@/services/user-service";
import { createOrg } from "@/services/user-service";

export function useCreateOrg() {
  const { refreshSession } = useSession();
  return useMutation<Org, Error, CreateOrgRequest>({
    mutationFn: (body) => createOrg(body),
    onSuccess: () => {
      void refreshBffSession().finally(() => refreshSession());
    },
  });
}
