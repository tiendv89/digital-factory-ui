import { WorkspaceProvider } from "@/features/workspaces/context/WorkspaceContext";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}
