import type { ParsedTask } from "@/services/yaml-parser";
import type { FeatureStatus } from "./lib/status";

export type BoardLoadError =
  | { kind: "access_denied"; message: string; retryable?: boolean }
  | { kind: "not_found"; message: string; retryable?: boolean }
  | { kind: "parse_error"; message: string; retryable?: boolean }
  | { kind: "network_error"; message: string; retryable?: boolean };

export type ActiveFilters = {
  statuses: ParsedTask["status"][];
};

export type FeatureActiveFilters = {
  statuses: FeatureStatus[];
};

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}
