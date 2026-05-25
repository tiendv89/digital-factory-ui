import type { FeatureSearchParams, TaskSearchParams } from "@/services/workflow-backend";

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

export type BoardListParams = {
  title?: string;
  status?: string | string[];
  page: number;
  limit: number;
  sort?: string;
};

export const BOARD_DEFAULT_LIMIT = 100;
export const BOARD_DEFAULT_SORT = "updated_at_desc";

export function buildBoardFeatureParams(
  params: BoardListParams,
): FeatureSearchParams {
  return {
    title: params.title,
    status: params.status,
    page: params.page,
    limit: params.limit,
    sort: params.sort ?? BOARD_DEFAULT_SORT,
  };
}

export function buildBoardTaskParams(
  params: BoardListParams,
): TaskSearchParams {
  return {
    title: params.title,
    status: params.status,
    page: params.page,
    limit: params.limit,
    sort: params.sort ?? BOARD_DEFAULT_SORT,
  };
}

/**
 * Returns true when search query or status filter has changed in a way that
 * should reset the page counter to 1.
 *
 * Page-only changes (pagination navigation) must not trigger a reset.
 */
export function shouldResetPage(
  prev: BoardListParams,
  next: BoardListParams,
): boolean {
  return (
    normalizeQuery(prev.title) !== normalizeQuery(next.title) ||
    normalizeStatus(prev.status) !== normalizeStatus(next.status) ||
    (prev.sort ?? BOARD_DEFAULT_SORT) !== (next.sort ?? BOARD_DEFAULT_SORT)
  );
}

export function makeDefaultBoardListParams(): BoardListParams {
  return {
    page: 1,
    limit: BOARD_DEFAULT_LIMIT,
    sort: BOARD_DEFAULT_SORT,
  };
}

function normalizeQuery(q: string | undefined): string {
  return (q ?? "").trim();
}

function normalizeStatus(s: string | string[] | undefined): string {
  if (Array.isArray(s)) return s.join(",");
  return s ?? "";
}
