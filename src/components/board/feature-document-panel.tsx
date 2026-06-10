"use client";

import { AlertCircle, ExternalLink, RefreshCw } from "lucide-react";

import { useDocumentContent } from "@/hooks/board/use-document-content";
import type { FeatureDetail } from "@/services/workflow-backend/types";

import { MarkdownBlock } from "./markdown-block";

type FeatureDocumentPanelProps = {
  feature: FeatureDetail;
  documentType: string;
};

export function FeatureDocumentPanel({ feature, documentType }: FeatureDocumentPanelProps) {
  const doc = (feature.documents ?? []).find((d) => d.document_type === documentType);

  const { content, loading, error } = useDocumentContent(doc?.url, doc?.content);

  if (!doc) {
    return (
      <div data-feature-doc-empty={documentType} className="flex flex-1 flex-col items-center justify-center gap-2 py-20">
        <p className="text-sm text-text-muted">{documentType === "product_spec" ? "No product spec available." : "No technical design available."}</p>
      </div>
    );
  }

  const docTitle = documentType === "product_spec" ? "Product Spec" : "Technical Design";

  return (
    <div data-feature-doc={documentType} className="w-1/2 px-6 py-6">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">{docTitle}</h2>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8">
            <RefreshCw className="h-4 w-4 animate-spin text-text-muted" aria-hidden="true" />
            <p className="text-sm text-text-muted">Loading document content…</p>
          </div>
        ) : content ? (
          <div className="border border-border bg-surface px-6 py-5">
            <MarkdownBlock content={content} />
          </div>
        ) : error ? (
          <div data-feature-doc-error className="flex flex-col gap-2 border border-danger/30 bg-danger-bg px-4 py-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
              <p className="text-sm text-danger">Failed to load document content.</p>
            </div>
            {doc.url && (
              <a href={doc.url} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1.5 text-xs text-primary transition-colors hover:underline">
                Open in GitHub
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </div>
        ) : (
          <div data-feature-doc-no-content className="flex flex-col items-center justify-center gap-2 border border-border bg-surface px-4 py-8">
            <p className="text-sm text-text-muted">No document content available.</p>
            {doc.url && (
              <a href={doc.url} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1.5 text-xs text-primary transition-colors hover:underline">
                Open in GitHub
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </div>
        )}
      </div>

      <div></div>
    </div>
  );
}
