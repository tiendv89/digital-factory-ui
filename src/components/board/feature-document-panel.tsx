"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChevronRight, Edit2, ExternalLink, Eye, FileText, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { workspaceKeys } from "@/constants/query-keys";
import { getDocumentContent, saveDocument, StaleDocumentError } from "@/services/workflow-backend/documents";
import type { FeatureDetail } from "@/services/workflow-backend/types";

import { MarkdownBlock } from "./markdown-block";
import { MarkdownCodeEditor } from "./markdown-code-editor";

type FeatureDocumentPanelProps = {
  feature: FeatureDetail;
  documentType: "product_spec" | "technical_design" | "tasks" | "handoff";
};

const DOC_TITLES: Record<FeatureDocumentPanelProps["documentType"], string> = {
  product_spec: "Product Spec",
  technical_design: "Technical Design",
  tasks: "Tasks",
  handoff: "Handoff",
};

const DOC_FILENAMES: Record<FeatureDocumentPanelProps["documentType"], string> = {
  product_spec: "product-spec.md",
  technical_design: "technical-design.md",
  tasks: "tasks.md",
  handoff: "handoffs/handoff.md",
};

type EditMode = "view" | "edit";
type EditState = "raw" | "preview";

export function FeatureDocumentPanel({ feature, documentType }: FeatureDocumentPanelProps) {
  const queryClient = useQueryClient();
  const doc = (feature.documents ?? []).find((d) => d.document_type === documentType);

  const contentQueryKey = workspaceKeys.documentContent(feature.workspace_id, feature.feature_id, documentType);

  const {
    data: docContent,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: contentQueryKey,
    queryFn: () => getDocumentContent(feature.workspace_id, feature.feature_id, documentType),
    // Always fetch: tasks.md and handoffs/handoff.md are never indexed in
    // workspace_feature_documents, and a feature may have no init PR (e.g. it's
    // already in handoff). The backend resolves the conventional path across
    // the feature/init/base branches and returns empty when truly absent.
    staleTime: 30_000,
  });

  const [mode, setMode] = useState<EditMode>("view");
  const [editState, setEditState] = useState<EditState>("raw");
  const [editText, setEditText] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [staleConflict, setStaleConflict] = useState(false);

  const enterEdit = useCallback(() => {
    const text = docContent?.content ?? "";
    setEditText(text);
    setIsDirty(false);
    setSaveError(null);
    setStaleConflict(false);
    setEditState("raw");
    setMode("edit");
  }, [docContent]);

  const handleDiscard = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm("Discard unsaved changes?");
      if (!confirmed) return;
    }
    setMode("view");
    setIsDirty(false);
    setSaveError(null);
    setStaleConflict(false);
  }, [isDirty]);

  const handleTextChange = useCallback((text: string) => {
    setEditText(text);
    setIsDirty(true);
    setStaleConflict(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!docContent && !doc) return;
    setIsSaving(true);
    setSaveError(null);
    setStaleConflict(false);
    try {
      await saveDocument(feature.workspace_id, feature.feature_id, documentType as "product_spec" | "technical_design", editText, docContent?.sha ?? null);
      setMode("view");
      setIsDirty(false);
      void queryClient.invalidateQueries({ queryKey: contentQueryKey });
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.documentPr(feature.workspace_id, feature.feature_id),
      });
    } catch (err) {
      if (err instanceof StaleDocumentError) {
        setStaleConflict(true);
        setSaveError("This document changed since you opened it. Reload to get the latest version.");
      } else {
        setSaveError(err instanceof Error ? err.message : "Save failed");
      }
    } finally {
      setIsSaving(false);
    }
  }, [docContent, doc, editText, feature.feature_id, feature.workspace_id, documentType, queryClient, contentQueryKey]);

  const handleReload = useCallback(() => {
    setMode("view");
    setIsDirty(false);
    setSaveError(null);
    setStaleConflict(false);
    void queryClient.invalidateQueries({ queryKey: contentQueryKey });
  }, [queryClient, contentQueryKey]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const docTitle = DOC_TITLES[documentType];
  const githubUrl = docContent?.url ?? doc?.url;

  const docPath = doc?.source_path || `docs/features/${feature.feature_name}/${DOC_FILENAMES[documentType]}`;
  const pathSegments = docPath.split("/").filter(Boolean);

  return (
    <div data-feature-doc={documentType} className="w-full">
      {/* Sticky breadcrumb path + document actions */}
      <div data-docs-breadcrumb className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-bg px-4 py-1.5">
        <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto text-xs text-text-muted">
          {pathSegments.map((seg, i) => {
            const isLast = i === pathSegments.length - 1;
            return (
              <span key={`${seg}-${i}`} className="flex items-center gap-0.5 whitespace-nowrap">
                {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-text-muted" aria-hidden="true" />}
                {isLast && <FileText className="mr-0.5 h-3 w-3 shrink-0 text-text-secondary" aria-hidden="true" />}
                <span className={isLast ? "text-text-secondary" : undefined}>{seg}</span>
              </span>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {mode === "view" ? (
            <>
              {githubUrl && (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  data-doc-github-link={documentType}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
                  title="Open on GitHub"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                data-doc-preview-toggle={documentType}
                onClick={() => setEditState((s) => (s === "raw" ? "preview" : "raw"))}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
                title={editState === "raw" ? "Show preview" : "Show editor"}
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                {editState === "raw" ? "Preview" : "Source"}
              </button>
              <button
                type="button"
                data-doc-discard-btn={documentType}
                onClick={handleDiscard}
                disabled={isSaving}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-surface hover:text-text-primary disabled:opacity-50"
                title="Discard changes"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Discard
              </button>
              <button
                type="button"
                data-doc-save-btn={documentType}
                onClick={() => void handleSave()}
                disabled={isSaving || !isDirty}
                className="flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                title="Save document"
              >
                {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                Save
              </button>
            </>
          )}
        </div>
      </div>

      <div className="">
        {/* Show the empty state only when there is genuinely nothing to show:
            no indexed document, no fetched content, and not currently loading.
            For init-PR features the doc isn't indexed yet (`doc` undefined) but
            the backend resolves content from the init branch — gating on `doc`
            alone wrongly hid that content. */}
        {!doc && !docContent?.content && !isLoading ? (
          <div data-feature-doc-empty={documentType} className="flex min-h-[60vh] flex-col items-center justify-center gap-2">
            <p className="text-sm text-text-muted">{`No ${docTitle.toLowerCase()} available.`}</p>
          </div>
        ) : (
          <>
            {/* Error / conflict banners */}
            {saveError && (
              <div data-doc-save-error={documentType} className="mb-3 flex flex-col gap-2 border border-danger/30 bg-danger-bg px-4 py-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
                  <p className="text-sm text-danger">{saveError}</p>
                </div>
                {staleConflict && (
                  <button type="button" data-doc-reload-btn={documentType} onClick={handleReload} className="self-start text-xs text-primary underline hover:no-underline">
                    Reload latest version
                  </button>
                )}
              </div>
            )}

            {/* Loading state */}
            {isLoading ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-text-muted" aria-hidden="true" />
                <p className="text-sm text-text-muted">Loading document content…</p>
              </div>
            ) : fetchError ? (
              <div data-feature-doc-error className="flex flex-col gap-2 border border-danger/30 bg-danger-bg px-4 py-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
                  <p className="text-sm text-danger">Failed to load document content.</p>
                </div>
                {githubUrl && (
                  <a href={githubUrl} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1.5 text-xs text-primary transition-colors hover:underline">
                    Open in GitHub
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                )}
              </div>
            ) : mode === "view" ? (
              docContent?.content ? (
                <div className="bg-surface px-6 py-5">
                  <MarkdownBlock content={docContent.content} />
                </div>
              ) : (
                <div data-feature-doc-no-content className="flex flex-col items-center justify-center gap-2 border border-border bg-surface px-4 py-8">
                  <p className="text-sm text-text-muted">No document content available.</p>
                  {githubUrl && (
                    <a href={githubUrl} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1.5 text-xs text-primary transition-colors hover:underline">
                      Open in GitHub
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  )}
                </div>
              )
            ) : /* edit mode */ editState === "raw" ? (
              <MarkdownCodeEditor value={editText} onChange={handleTextChange} ariaLabel={`Edit ${docTitle}`} dataAttr="data-doc-editor" />
            ) : (
              <div className="bg-surface px-6 py-5">
                <MarkdownBlock content={editText} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
