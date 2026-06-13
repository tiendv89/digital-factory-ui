"use client";

import { AlertCircle, ExternalLink, FileText } from "lucide-react";

export type DocumentEditOutput = {
  ok?: boolean;
  pr_url?: string;
  commit_sha?: string;
  conflict?: boolean;
  document?: string;
  edits?: Array<{ old_string: string; new_string: string }>;
  summary?: string;
};

type DocumentEditCardProps = {
  toolName: string;
  output: DocumentEditOutput;
};

const TOOL_LABELS: Record<string, string> = {
  workflow_edit_document: "Document Edit",
  workflow_write_product_spec: "Product Spec Rewritten",
  workflow_write_technical_design: "Technical Design Rewritten",
};

const DOCUMENT_LABELS: Record<string, string> = {
  product_spec: "Product Spec",
  technical_design: "Technical Design",
};

export function DocumentEditCard({ toolName, output }: DocumentEditCardProps) {
  const { ok, pr_url, commit_sha, conflict, document, edits, summary } = output;
  const toolLabel = TOOL_LABELS[toolName] ?? "Document Changed";
  const docLabel = document ? (DOCUMENT_LABELS[document] ?? document) : null;

  const editCount = Array.isArray(edits) ? edits.length : null;

  let changeDesc: string;
  if (summary) {
    changeDesc = summary;
  } else if (toolName === "workflow_edit_document" && editCount !== null) {
    changeDesc = editCount === 1 ? "1 targeted edit applied" : `${editCount} targeted edits applied`;
  } else if (toolName === "workflow_write_product_spec" || toolName === "workflow_write_technical_design") {
    changeDesc = "Full document rewritten";
  } else {
    changeDesc = "Document updated";
  }

  return (
    <div data-document-edit-card className="mt-1 rounded-lg border border-border bg-surface p-3 text-sm">
      <div className="flex items-start gap-2">
        <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-text-primary">
            {toolLabel}
            {docLabel && <span className="ml-1 font-normal text-text-secondary">— {docLabel}</span>}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">{changeDesc}</p>

          {conflict && (
            <div className="mt-1.5 flex items-center gap-1 text-xs text-warning">
              <AlertCircle className="h-3 w-3" />
              <span>Conflict detected — reload to get the latest version</span>
            </div>
          )}

          {ok === false && !conflict && <p className="mt-1 text-xs text-danger">Write failed</p>}

          <div className="mt-1.5 flex items-center gap-2">
            {commit_sha && <span className="font-mono text-[10px] text-text-muted">{commit_sha.slice(0, 7)}</span>}
            {pr_url && (
              <a href={pr_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-[10px] text-primary hover:underline">
                <ExternalLink className="h-2.5 w-2.5" />
                View PR
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
