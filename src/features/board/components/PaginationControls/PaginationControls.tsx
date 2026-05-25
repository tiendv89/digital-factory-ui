"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export type PageInfo = {
  page: number;
  limit: number;
  total: number;
};

export type PaginationControlsProps = {
  pageInfo: PageInfo;
  onPageChange: (page: number) => void;
  /** When true, the controls are hidden entirely (no items to page). */
  disabled?: boolean;
};

function totalPages({ total, limit }: PageInfo): number {
  if (limit <= 0 || total <= 0) return 1;
  return Math.max(1, Math.ceil(total / limit));
}

function displayRange(info: PageInfo): { from: number; to: number } {
  const from = (info.page - 1) * info.limit + 1;
  const to = Math.min(info.page * info.limit, info.total);
  return { from, to };
}

export function PaginationControls({
  pageInfo,
  onPageChange,
  disabled = false,
}: PaginationControlsProps) {
  const pages = totalPages(pageInfo);
  const { from, to } = displayRange(pageInfo);

  if (disabled || pageInfo.total === 0) return null;

  const atFirst = pageInfo.page <= 1;
  const atLast = pageInfo.page >= pages;

  return (
    <div
      className="flex shrink-0 items-center justify-between border-t border-border bg-surface px-4 py-2"
      role="navigation"
      aria-label="Pagination"
    >
      <p className="text-xs text-text-muted">
        <span className="font-medium text-text-secondary">
          {from}&ndash;{to}
        </span>{" "}
        of{" "}
        <span className="font-medium text-text-secondary">{pageInfo.total}</span>
      </p>

      <div className="flex items-center gap-1">
        <span className="text-xs text-text-muted">
          Page {pageInfo.page} of {pages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(pageInfo.page - 1)}
          disabled={atFirst}
          aria-label="Previous page"
          className="flex h-7 w-7 items-center justify-center border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(pageInfo.page + 1)}
          disabled={atLast}
          aria-label="Next page"
          className="flex h-7 w-7 items-center justify-center border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
