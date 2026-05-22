"use client";

import { useEffect, useRef, useState } from "react";
import {
  searchFeatures,
  buildFeatureParams,
  type FeatureSearchParams,
} from "@/services/workflow-backend";
import { adaptFeatureSummaries } from "@/features/workspaces/lib/workspaceAdapter";
import type { ParsedFeature } from "@/services/yaml-parser";
import type { BoardLoadError } from "../types";

const DEBOUNCE_MS = 300;

function isEmptyParams(params: FeatureSearchParams): boolean {
  return !params.title && !params.status;
}

export type UseBackendFeatureSearchResult = {
  results: ParsedFeature[] | null;
  searching: boolean;
  searchError: BoardLoadError | null;
};

export function useBackendFeatureSearch(
  workspaceId: string | null,
  params: FeatureSearchParams,
): UseBackendFeatureSearchResult {
  const { title, status } = params;
  const [results, setResults] = useState<ParsedFeature[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<BoardLoadError | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const searchParams = { title, status };

    if (!workspaceId || isEmptyParams(searchParams)) {
      setResults(null);
      setSearching(false);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const id = ++requestIdRef.current;
      setSearching(true);
      setSearchError(null);

      try {
        const features = await searchFeatures(
          workspaceId,
          buildFeatureParams(searchParams),
        );
        if (cancelled || requestIdRef.current !== id) return;
        setResults(adaptFeatureSummaries(features));
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
        setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [workspaceId, title, status]);

  return { results, searching, searchError };
}
