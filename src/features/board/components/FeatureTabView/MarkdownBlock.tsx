"use client";

import { lazy, Suspense } from "react";

const MarkdownContent = lazy(() =>
  import("@/lib/markdown").then((m) => ({ default: m.MarkdownContent })),
);

function MarkdownFallback() {
  return (
    <div data-markdown-loading className="py-6">
      <p className="text-sm text-text-muted">Loading document content…</p>
    </div>
  );
}

export function MarkdownBlock({ content }: { content: string }) {
  return (
    <Suspense fallback={<MarkdownFallback />}>
      <MarkdownContent content={content} />
    </Suspense>
  );
}
