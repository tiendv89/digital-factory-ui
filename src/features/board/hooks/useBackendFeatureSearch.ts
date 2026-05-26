"use client";

import { useEffect, useRef, useState } from "react";
import {
  searchFeaturesPage,
  buildFeatureParams,
  type FeatureSearchParams,
} from "@/services/workflow-backend";
import { adaptFeatureSummaries } from "@/features/workspaces/lib/workspaceAdapter";
import type { ParsedFeature } from "@/services/yaml-parser";
import type { BoardLoadError, PaginationMeta } from "../types";

const DEBOUNCE_MS = 300;

function isEmptyParams(params: FeatureSearchParams): boolean {
  return !params.title && !params.status;
}

export type UseBackendFeatureSearchResult = {
  results: ParsedFeature[] | null;
  searching: boolean;
  searchError: BoardLoadError | null;
  pagination: PaginationMeta | null;
};

export function useBackendFeatureSearch(
  workspaceId: string | null,
  params: FeatureSearchParams,
): UseBackendFeatureSearchResult {
  const { title, status, page, limit, sort } = params;
  const [results, setResults] = useState<ParsedFeature[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<BoardLoadError | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const searchParams = { title, status, page, limit, sort };

    if (!workspaceId || isEmptyParams(searchParams)) {
      setResults(null);
      setSearching(false);
      setSearchError(null);
      setPagination(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const id = ++requestIdRef.current;
      setSearching(true);
      setSearchError(null);

      try {
        const paged = await searchFeaturesPage(
          workspaceId,
          buildFeatureParams(searchParams),
        );
        if (cancelled || requestIdRef.current !== id) return;
        setResults(adaptFeatureSummaries(paged.items));
        setPagination({
          total: paged.total,
          page: paged.page,
          limit: paged.limit,
        });
        setSearching(false);
      } catch (err: unknown) {
        if (cancelled || requestIdRef.current !== id) return;
        const e = err as { code?: string; message?: string; retryable?: boolean };
        setSearchError({
          kind: "network_error",
          message: e.message ?? "Feature search failed",
          retryable: e.retryable,
        });
        setResults([]);
        setPagination(null);
        setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [workspaceId, title, status, page, limit, sort]);

  return { results, searching, searchError, pagination };
}
