import type { ApiError } from "@/services/workflow-backend";

export function getImportErrorMessage(err: ApiError): { field?: "repo_url" | "name"; message: string } {
  switch (err.code) {
    case "VALIDATION_INVALID_URL":
      return { field: "repo_url", message: "Invalid repository URL." };
    case "VALIDATION_MISSING_INPUT":
      return { field: "repo_url", message: err.message || "Repository URL is required." };
    case "GITHUB_NOT_FOUND":
      return { message: "Repository not found. Check the URL and try again." };
    case "GITHUB_UNAUTHORIZED":
      return { message: "GitHub access denied. Check repository permissions." };
    case "GITHUB_RATE_LIMIT":
      return { message: "GitHub rate limit reached. Please wait and try again." };
    case "ADAPTER_TIMEOUT":
      return { message: "Request timed out. Please try again." };
    default:
      return { message: err.message || "Import failed. Please try again." };
  }
}
