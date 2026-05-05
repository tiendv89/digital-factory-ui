"use client";

import { HeroUIProvider } from "@heroui/react";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return <HeroUIProvider>{children}</HeroUIProvider>;
}
