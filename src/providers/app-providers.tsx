"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { SessionProvider } from "@/components/auth";
import { SessionGate } from "@/components/auth/session-gate";
import { WorkspaceProvider } from "@/components/workspaces/workspace-context";
import { createQueryClient } from "@/constants/query-client";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <SessionGate>
          <WorkspaceProvider>{children}</WorkspaceProvider>
        </SessionGate>
      </SessionProvider>
    </QueryClientProvider>
  );
}
