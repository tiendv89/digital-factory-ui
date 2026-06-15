"use client";

import axios from "axios";
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
export function useDocumentContent(url: string | undefined | null, existingContent: string | undefined | null): UseDocumentContentResult {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const fetchContent = useCallback(async () => {
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
      const { data } = await axios.post<{ content: string }>("/api/content/fetch", { url });

      if (id !== requestId.current) return;

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
