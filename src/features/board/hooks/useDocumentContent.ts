"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseDocumentContentResult = {
  content: string | null;
  loading: boolean;
  error: string | null;
};

/**
 * Hook that fetches document content from an external URL via the
 * server-side content proxy (/api/content/fetch).
 *
 * Skips fetching when `url` is falsy or when `existingContent` is provided.
 */
export function useDocumentContent(
  url: string | undefined | null,
  existingContent: string | undefined | null,
): UseDocumentContentResult {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const fetchContent = useCallback(async () => {
    // Don't fetch if content already available from backend
    if (existingContent) {
      setContent(existingContent);
      setLoading(false);
      setError(null);
      return;
    }

    if (!url) {
      setContent(null);
      setLoading(false);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/content/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      // Guard against stale responses
      if (id !== requestId.current) return;

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setContent(data.content);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : "Failed to fetch content");
      setContent(null);
    } finally {
      if (id === requestId.current) {
        setLoading(false);
      }
    }
  }, [url, existingContent]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return { content, loading, error };
}
