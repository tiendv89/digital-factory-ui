import type { ParsedTask } from "@/services/yaml-parser";

export type BoardLoadError =
  | { kind: "access_denied"; message: string }
  | { kind: "not_found"; message: string }
  | { kind: "parse_error"; message: string }
  | { kind: "network_error"; message: string };

export type ActiveFilters = {
  statuses: ParsedTask["status"][];
};
