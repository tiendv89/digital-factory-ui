"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Edit2,
  Eye,
  ExternalLink,
  RefreshCw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { workspaceKeys } from "@/constants/query-keys";
import {
  StaleDocumentError,
  saveDocument,
} from "@/services/hermes-agent/documents";
import { getDocumentContent } from "@/services/workflow-backend/documents";
import type { FeatureDetail } from "@/services/workflow-backend/types";

import { MarkdownBlock } from "./markdown-block";

type FeatureDocumentPanelProps = {
  feature: FeatureDetail;
  documentType: "product_spec" | "technical_design";
};

type EditMode = "view" | "edit";
type EditState = "raw" | "preview";

export function FeatureDocumentPanel({
  feature,
  documentType,
}: FeatureDocumentPanelProps) {
  const queryClient = useQueryClient();
  const doc = (feature.documents ?? []).find(
    (d) => d.document_type === documentType,
  );

  const contentQueryKey = workspaceKeys.documentContent(
    feature.workspace_id,
    feature.feature_id,
    documentType,
  );

  const {
    data: docContent,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: contentQueryKey,
    queryFn: () =>
      getDocumentContent(
        feature.workspace_id,
        feature.feature_id,
        documentType as "product_spec" | "technical_design",
      ),
    enabled: !!doc,
    staleTime: 30_000,
  });

  const [mode, setMode] = useState<EditMode>("view");
  const [editState, setEditState] = useState<EditState>("raw");
  const [editText, setEditText] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [staleConflict, setStaleConflict] = useState(false);

  const enterEditRef = useRef<string | null>(null);

  const enterEdit = useCallback(() => {
    const text = docContent?.content ?? "";
    setEditText(text);
    enterEditRef.current = text;
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
      await saveDocument(
        feature.feature_id,
        documentType as "product_spec" | "technical_design",
        editText,
        docContent?.sha ?? null,
      );
      setMode("view");
      setIsDirty(false);
      void queryClient.invalidateQueries({ queryKey: contentQueryKey });
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.documentPr(
          feature.workspace_id,
          feature.feature_id,
        ),
      });
    } catch (err) {
      if (err instanceof StaleDocumentError) {
        setStaleConflict(true);
        setSaveError(
          "This document changed since you opened it. Reload to get the latest version.",
        );
      } else {
        setSaveError(err instanceof Error ? err.message : "Save failed");
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    docContent,
    doc,
    editText,
    feature.feature_id,
    feature.workspace_id,
    documentType,
    queryClient,
    contentQueryKey,
  ]);

  const handleReload = useCallback(() => {
    setMode("view");
    setIsDirty(false);
    setSaveError(null);
    setStaleConflict(false);
    void queryClient.invalidateQueries({ queryKey: contentQueryKey });
  }, [queryClient, contentQueryKey]);

  // Unsaved-changes guard: warn on browser/tab close
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const docTitle =
    documentType === "product_spec" ? "Product Spec" : "Technical Design";
  const githubUrl = docContent?.url ?? doc?.url;

  if (!doc) {
    return (
      <div
        data-feature-doc-empty={documentType}
        className="flex flex-1 flex-col items-center justify-center gap-2 py-20"
      >
        <p className="text-sm text-text-muted">
          {documentType === "product_spec"
            ? "No product spec available."
            : "No technical design available."}
        </p>
      </div>
    );
  }

  return (
    <div data-feature-doc={documentType} className="w-1/2 px-6 py-6">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">
            {docTitle}
          </h2>
          <div className="flex items-center gap-2">
            {githubUrl && mode === "view" && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text-primary"
                title="Open on GitHub"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
            {mode === "view" && !isLoading && (
              <button
                type="button"
                data-doc-edit-btn={documentType}
                onClick={enterEdit}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
                title="Edit document"
              >
                <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                Edit
              </button>
            )}
            {mode === "edit" && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-doc-preview-toggle={documentType}
                  onClick={() =>
                    setEditState((s) => (s === "raw" ? "preview" : "raw"))
                  }
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
                  {isSaving ? (
                    <RefreshCw
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : null}
                  Save
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error / conflict banners */}
        {saveError && (
          <div
            data-doc-save-error={documentType}
            className="mb-3 flex flex-col gap-2 border border-danger/30 bg-danger-bg px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <AlertCircle
                className="h-4 w-4 shrink-0 text-danger"
                aria-hidden="true"
              />
              <p className="text-sm text-danger">{saveError}</p>
            </div>
            {staleConflict && (
              <button
                type="button"
                data-doc-reload-btn={documentType}
                onClick={handleReload}
                className="self-start text-xs text-primary underline hover:no-underline"
              >
                Reload latest version
              </button>
            )}
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center gap-2 py-8">
            <RefreshCw
              className="h-4 w-4 animate-spin text-text-muted"
              aria-hidden="true"
            />
            <p className="text-sm text-text-muted">Loading document content…</p>
          </div>
        ) : fetchError ? (
          <div
            data-feature-doc-error
            className="flex flex-col gap-2 border border-danger/30 bg-danger-bg px-4 py-4"
          >
            <div className="flex items-center gap-2">
              <AlertCircle
                className="h-4 w-4 shrink-0 text-danger"
                aria-hidden="true"
              />
              <p className="text-sm text-danger">
                Failed to load document content.
              </p>
            </div>
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-1.5 text-xs text-primary transition-colors hover:underline"
              >
                Open in GitHub
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </div>
        ) : mode === "view" ? (
          docContent?.content ? (
            <div className="border border-border bg-surface px-6 py-5">
              <MarkdownBlock content={docContent.content} />
            </div>
          ) : (
            <div
              data-feature-doc-no-content
              className="flex flex-col items-center justify-center gap-2 border border-border bg-surface px-4 py-8"
            >
              <p className="text-sm text-text-muted">
                No document content available.
              </p>
              {githubUrl && (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-1.5 text-xs text-primary transition-colors hover:underline"
                >
                  Open in GitHub
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
            </div>
          )
        ) : /* edit mode */ editState === "raw" ? (
          <textarea
            data-doc-editor={documentType}
            value={editText}
            onChange={(e) => handleTextChange(e.target.value)}
            className="min-h-[480px] w-full resize-y border border-border bg-surface p-4 font-mono text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            spellCheck={false}
            aria-label={`Edit ${docTitle}`}
          />
        ) : (
          <div className="border border-border bg-surface px-6 py-5">
            <MarkdownBlock content={editText} />
          </div>
        )}
      </div>

      <div></div>
    </div>
  );
}
