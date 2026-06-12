import axios from "axios";

// The frontend talks to a single origin: the BFF. The BFF owns auth/session
// (cookie at the bare origin under /auth/*) and reverse-proxies API calls to the
// backend services under per-service prefixes.
const BFF_BASE_URL = process.env.NEXT_PUBLIC_BFF_URL ?? "http://localhost:8090";

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
