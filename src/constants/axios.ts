import axios from "axios";

/**
 * BFF origin. Initialised from the build-time NEXT_PUBLIC_BFF_URL (used by
 * `next dev` / local builds), then overridden at runtime by the server-loaded
 * config — RuntimeConfigProvider calls setBffBaseUrl() with the value the server
 * read from process.env at request time. This is what lets one image serve every
 * deployment without baking the URL in. Consumers just import the clients and
 * call them normally; the baseURL is resolved per-request via an interceptor.
 */
let bffBaseUrl = process.env.NEXT_PUBLIC_BFF_URL ?? "http://localhost:8090";

/** Set by RuntimeConfigProvider on first render with the server-resolved value. */
export function setBffBaseUrl(url: string | undefined): void {
  if (url) bffBaseUrl = url;
}

/** getBffBaseUrl returns the bare BFF origin, used for /auth/* (login, logout). */
export function getBffBaseUrl(): string {
  return bffBaseUrl;
}

/** Create a BFF client whose baseURL is resolved fresh on every request. */
function createBffClient(pathPrefix: string) {
  const client = axios.create({
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
  });
  client.interceptors.request.use((config) => {
    config.baseURL = `${bffBaseUrl}${pathPrefix}`;
    return config;
  });
  return client;
}

export const workflowApi = createBffClient("/bff/workflow-backend");

export const userServiceApi = createBffClient("/bff/user-service");

/** Re-syncs AccessibleOrgIDs in the BFF session after org create/join/leave. */
export async function refreshBffSession(): Promise<void> {
  const bffClient = createBffClient("");
  await bffClient.post("/bff/session/refresh");
}
