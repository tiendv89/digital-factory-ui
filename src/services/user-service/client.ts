import type { MeResponse } from "./types";

export function getUserServiceBase(): string {
  const base = process.env.NEXT_PUBLIC_USER_SERVICE_URL;
  if (!base) {
    throw new Error(
      "NEXT_PUBLIC_USER_SERVICE_URL is required for user-service API calls",
    );
  }
  return base;
}

export async function fetchMe(): Promise<MeResponse> {
  const res = await fetch(`${getUserServiceBase()}/api/me`, {
    credentials: "include",
  });
  if (res.status === 401) {
    const err = new Error("Unauthenticated") as Error & { status: number };
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch /api/me: ${res.status}`);
  }
  return res.json() as Promise<MeResponse>;
}

export async function logout(): Promise<void> {
  await fetch(`${getUserServiceBase()}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}
