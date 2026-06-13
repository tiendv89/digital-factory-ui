"use client";

import { Bot, Wrench } from "lucide-react";
import { useEffect, useRef } from "react";

import { ConversationContent, useConversationScroll } from "./conversation";
import { Loader } from "./loader";
import { Message } from "./message";
import type { ApprovalRequest } from "./tool-cards/approval-card";
import { ApprovalCard } from "./tool-cards/approval-card";
import type { DocumentEditOutput } from "./tool-cards/document-edit-card";
import { DocumentEditCard } from "./tool-cards/document-edit-card";
import type { ChatStatus, HermesMessage, ToolCallEntry } from "./types";

const DOCUMENT_EDIT_TOOLS = new Set(["workflow_edit_document", "workflow_write_product_spec", "workflow_write_technical_design"]);

type MessageThreadProps = {
  messages: HermesMessage[];
  status: ChatStatus;
  onStageTransition?: () => void;
};

export function MessageThread({ messages, status, onStageTransition }: MessageThreadProps) {
  const isStreaming = status === "streaming";
  const { scrollRef, isAtBottomRef } = useConversationScroll();
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll as content grows during streaming, only when already at bottom
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => {
      if (!isAtBottomRef.current) return;
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [isAtBottomRef, scrollRef]);

  if (messages.length === 0 && !isStreaming && status !== "connecting") {
    return (
      <div data-message-thread-empty className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface">
          <Bot className="h-5 w-5 text-text-muted" />
        </div>
        <p className="text-[13px] font-medium text-text-secondary">Start a conversation</p>
        <p className="text-[11px] text-text-muted">Ask a question or use a slash command to get started.</p>
      </div>
    );
  }

  return (
    <ConversationContent ref={contentRef} data-message-thread>
      {messages.map((msg) => (
        <div key={msg.id} className="flex flex-col gap-1.5">
          <Message message={msg} />
          {msg.toolCalls && msg.toolCalls.length > 0 && (
            <div className="flex flex-col gap-1 pl-2">
              {msg.toolCalls.map((tc) => (
                <ToolCallRow key={tc.callId} toolCall={tc} onStageTransition={onStageTransition} />
              ))}
            </div>
          )}
        </div>
      ))}
      {(isStreaming || status === "connecting") && (
        <div className="flex justify-start">
          <div className="rounded-lg bg-surface-secondary px-3 py-2">
            <Loader />
          </div>
        </div>
      )}
    </ConversationContent>
  );
}

type ToolCallRowProps = {
  toolCall: ToolCallEntry;
  onStageTransition?: () => void;
};

function ToolCallRow({ toolCall, onStageTransition }: ToolCallRowProps) {
  const { name, status, output } = toolCall;

  if (status === "done" && output !== undefined) {
    if (name === "workflow_request_approval") {
      const approvalOutput = extractApprovalOutput(output);
      if (approvalOutput) {
        return <ApprovalCard output={approvalOutput} onTransitionSuccess={onStageTransition} />;
      }
    }

    if (DOCUMENT_EDIT_TOOLS.has(name)) {
      const editOutput = extractDocumentEditOutput(output);
      if (editOutput) {
        return <DocumentEditCard toolName={name} output={editOutput} />;
      }
    }
  }

  return (
    <div data-tool-call className="flex items-center gap-1.5 text-xs text-text-muted">
      <Wrench className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="font-mono">{name}</span>
      {status === "running" && <span className="text-text-muted">(running…)</span>}
      {status === "done" && <span className="text-success">(done)</span>}
    </div>
  );
}

function extractApprovalOutput(output: unknown): ApprovalRequest | null {
  if (!output || typeof output !== "object") return null;
  const o = output as Record<string, unknown>;
  const req = (o.approval_request ?? null) as Record<string, unknown> | null;
  if (!req) return null;
  if (typeof req.feature_id !== "string" || typeof req.stage !== "string" || typeof req.review_status !== "string") {
    return null;
  }
  return { feature_id: req.feature_id, stage: req.stage, review_status: req.review_status };
}

function extractDocumentEditOutput(output: unknown): DocumentEditOutput | null {
  if (!output || typeof output !== "object") return null;
  return output as DocumentEditOutput;
}
