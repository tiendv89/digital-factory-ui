"use client";

import { QueryClient } from "@tanstack/react-query";

const STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        gcTime: STALE_TIME_MS,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}
