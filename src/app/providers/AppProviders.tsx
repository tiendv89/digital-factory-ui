"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-client";
import { WorkspaceProvider } from "@/features/workspaces/context/WorkspaceContext";
import { SessionProvider } from "@/features/auth";
import { SessionGate } from "@/features/auth/components/SessionGate";

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
