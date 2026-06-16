"use client";

import { createContext, useContext, useState } from "react";

import { setBffBaseUrl } from "@/constants/axios";

/**
 * Runtime configuration resolved on the SERVER (see loadRuntimeConfig) and handed
 * to the client as a normal prop. No window globals, no injected <script>: the
 * server reads process.env at request time, the client consumes it via the
 * useRuntimeConfig() / useRuntimeEnv() hooks. One image serves every deployment.
 */
export interface RuntimeConfig {
  /** BFF origin (no trailing slash). */
  bffUrl: string;
  /** Every NEXT_PUBLIC_* var (prefix stripped) for generic access. */
  values: Record<string, string>;
}

const RuntimeConfigContext = createContext<RuntimeConfig | null>(null);

export function RuntimeConfigProvider({
  config,
  children,
}: {
  config: RuntimeConfig;
  children: React.ReactNode;
}) {
  // Initialise the (non-React) axios layer once, synchronously, before any child
  // renders — so API clients have the right baseURL before the first request.
  // useState's lazy initialiser is the React-blessed way to run setup-once code.
  useState(() => {
    setBffBaseUrl(config.bffUrl);
    return null;
  });

  return <RuntimeConfigContext.Provider value={config}>{children}</RuntimeConfigContext.Provider>;
}

/** Access the full runtime config. */
export function useRuntimeConfig(): RuntimeConfig {
  const config = useContext(RuntimeConfigContext);
  if (!config) {
    throw new Error("useRuntimeConfig must be used within a RuntimeConfigProvider");
  }
  return config;
}

/** Read a single NEXT_PUBLIC_* value (prefix stripped), e.g. useRuntimeEnv("FEATURE_X"). */
export function useRuntimeEnv(key: string, fallback = ""): string {
  return useRuntimeConfig().values[key] ?? fallback;
}
