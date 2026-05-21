import type { BoardLoadError } from "../types";

export function mapApiBoardError(err: unknown): BoardLoadError {
  if (err && typeof err === "object" && "code" in err) {
    const e = err as { code: string; message: string; retryable?: boolean };
    const retryable = e.retryable;
    if (e.code === "DATABASE_NOT_FOUND" || e.code === "GITHUB_NOT_FOUND") {
      return { kind: "not_found", message: e.message, retryable };
    }
    if (e.code === "GITHUB_UNAUTHORIZED") {
      return { kind: "access_denied", message: e.message, retryable };
    }
    return { kind: "network_error", message: e.message, retryable };
  }
  if (err instanceof Error) {
    return { kind: "network_error", message: err.message };
  }
  return { kind: "network_error", message: "Unknown error" };
}
