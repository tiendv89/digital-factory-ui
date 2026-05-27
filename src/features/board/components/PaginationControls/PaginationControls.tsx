"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

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
  /** When provided, a page-size selector dropdown is rendered. */
  onLimitChange?: (limit: number) => void;
  /** Available page-size options (default: PAGE_SIZE_OPTIONS). */
  availableLimits?: readonly number[];
};

function totalPages({ total, limit }: PageInfo): number {
  if (limit <= 0 || total <= 0) return 1;
  return Math.max(1, Math.ceil(total / limit));
}

function displayRange(info: PageInfo): { from: number; to: number } {
  if (info.limit <= 0) return { from: 0, to: 0 };
  const from = (info.page - 1) * info.limit + 1;
  const to = Math.min(info.page * info.limit, info.total);
  return { from, to };
}

function PageSizeSelector({
  value,
  options,
  onChange,
}: {
  value: number;
  options: readonly number[];
  onChange: (limit: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const handleSelect = useCallback(
    (limit: number) => {
      onChange(limit);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Page size"
        className="flex h-6 items-center gap-1 border border-border px-2 text-xs text-text-secondary hover:bg-surface-subtle"
      >
        {value}
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute bottom-full left-0 z-30 mb-1 w-full border border-border bg-surface shadow-lg"
        >
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              role="option"
              aria-selected={opt === value}
              onClick={() => handleSelect(opt)}
              className={
                "block w-full px-3 py-1 text-left text-xs " +
                (opt === value
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-text-secondary hover:bg-surface-subtle")
              }
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PaginationControls({
  pageInfo,
  onPageChange,
  disabled = false,
  onLimitChange,
  availableLimits = PAGE_SIZE_OPTIONS,
}: PaginationControlsProps) {
  const pages = totalPages(pageInfo);
  const { from, to } = displayRange(pageInfo);

  if (disabled || pageInfo.total === 0) return null;

  const atFirst = pageInfo.page <= 1;
  const atLast = pageInfo.page >= pages;

  return (
    <div
      className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-4 py-2"
      role="navigation"
      aria-label="Pagination"
    >
      <div className="flex items-center gap-3">
        {onLimitChange && (
          <PageSizeSelector
            value={pageInfo.limit}
            options={availableLimits}
            onChange={onLimitChange}
          />
        )}
        <p className="text-xs text-text-muted">
          <span className="font-medium text-text-secondary">
            {from}&ndash;{to}
          </span>{" "}
          of{" "}
          <span className="font-medium text-text-secondary">
            {pageInfo.total}
          </span>
        </p>
      </div>

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
