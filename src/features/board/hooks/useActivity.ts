"use client";

import { useQuery } from "@tanstack/react-query";
import { listActivity } from "@/services/workflow-backend/client";
import type { ActivityEvent, ApiError } from "@/services/workflow-backend/types";
import { workspaceKeys } from "@/lib/query-keys";

export type UseActivityResult = {
  events: ActivityEvent[];
  loading: boolean;
  error: ApiError | null;
};

export function useActivity(workspaceId: string | null): UseActivityResult {
  const { data, isLoading, error } = useQuery<ActivityEvent[], ApiError>({
    queryKey: workspaceId
      ? workspaceKeys.activity(workspaceId)
      : ["activity-disabled"],
    queryFn: () => listActivity(workspaceId!, { audience: "client" }),
    enabled: workspaceId !== null,
  });

  return {
    events: data ?? [],
    loading: isLoading,
    error: error ?? null,
  };
}
