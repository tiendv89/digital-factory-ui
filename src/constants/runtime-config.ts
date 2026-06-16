import "server-only";

import type { RuntimeConfig } from "@/providers/runtime-config-provider";

/**
 * Read deployment config from the environment on the SERVER at request time.
 *
 * In a standalone container, process.env reflects the env vars the container was
 * started with — NOT what was present at `docker build` time. (Object.entries on
 * process.env reads live values; only literal `process.env.NEXT_PUBLIC_X`
 * references are inlined at build.) So one image serves every deployment with no
 * per-config files and no per-config CI: just
 *   docker run -e NEXT_PUBLIC_BFF_URL=... -e NEXT_PUBLIC_FEATURE_X=... <image>
 *
 * Every NEXT_PUBLIC_* var is exposed (prefix stripped), matching build-time names
 * so local dev and production resolve identically. Must be called from a
 * dynamically rendered server component (the root layout is force-dynamic) so the
 * read happens per request rather than being frozen at build.
 */
const RUNTIME_ENV_PREFIX = "NEXT_PUBLIC_";
const DEFAULT_BFF_URL = "http://localhost:8090";

export function loadRuntimeConfig(): RuntimeConfig {
  const values: Record<string, string> = {};

  for (const [name, value] of Object.entries(process.env)) {
    if (value != null && name.startsWith(RUNTIME_ENV_PREFIX)) {
      values[name.slice(RUNTIME_ENV_PREFIX.length)] = value;
    }
  }

  // Backward-compat: accept the legacy unprefixed BFF_URL.
  if (process.env.BFF_URL && values.BFF_URL == null) {
    values.BFF_URL = process.env.BFF_URL;
  }

  return {
    bffUrl: values.BFF_URL || DEFAULT_BFF_URL,
    values,
  };
}
