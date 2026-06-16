import axios from "axios";

declare global {
  interface Window {
    __ENV__?: { BFF_URL?: string };
  }
}

/**
 * Resolve the BFF origin at runtime, preferring values injected into the page
 * by the container entrypoint (window.__ENV__) so a single build/image can be
 * configured per deployment. Falls back to the build-time NEXT_PUBLIC_BFF_URL
 * (used by `next dev` / local builds) and finally a local-dev default.
 */
function resolveBffBaseUrl(): string {
  if (typeof window !== "undefined" && window.__ENV__?.BFF_URL) {
    return window.__ENV__.BFF_URL;
  }
  return process.env.NEXT_PUBLIC_BFF_URL ?? "http://localhost:8090";
}

const BFF_BASE_URL = resolveBffBaseUrl();

/** getBffBaseUrl returns the bare BFF origin, used for /auth/* (login, logout). */
export function getBffBaseUrl(): string {
  return BFF_BASE_URL;
}

export const workflowApi = axios.create({
  baseURL: `${BFF_BASE_URL}/bff/workflow-backend`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export const userServiceApi = axios.create({
  baseURL: `${BFF_BASE_URL}/bff/user-service`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});
