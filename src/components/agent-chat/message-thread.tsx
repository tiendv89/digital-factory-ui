"use client";

import { Bot, ChevronRight, Loader2, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ConversationContent, useConversationScroll } from "./conversation";
import { CTASuggestionRow } from "./cta-suggestion-row";
import { EmptyStateCTARow } from "./empty-state-cta-row";
import { Loader } from "./loader";
import { Message } from "./message";
import { ThinkingDisclosure } from "./thinking-disclosure";
import type { ApprovalRequest } from "./tool-cards/approval-card";
import { ApprovalCard } from "./tool-cards/approval-card";
import type { DocumentEditOutput } from "./tool-cards/document-edit-card";
import { DocumentEditCard } from "./tool-cards/document-edit-card";
import type { ChatStatus, HermesMessage, ToolCallEntry } from "./types";

const DOCUMENT_EDIT_TOOLS = new Set(["workflow_edit_document", "workflow_write_product_spec", "workflow_write_technical_design"]);

type MessageThreadProps = {
  messages: HermesMessage[];
  status: ChatStatus;
  /** The id of the assistant message currently streaming (used to show live thinking). */
  streamingAssistantId?: string | null;
  onStageTransition?: () => void;
  onCtaAction?: (actionText: string) => void;
  featureStatus?: string | null;
  emptyStateDismissed?: boolean;
};

export function MessageThread({ messages, status, streamingAssistantId, onStageTransition, onCtaAction, featureStatus, emptyStateDismissed }: MessageThreadProps) {
  const isStreaming = status === "streaming";
  const { scrollRef, isAtBottomRef } = useConversationScroll();
  const contentRef = useRef<HTMLDivElement>(null);

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
      <div data-message-thread-empty className="flex h-full flex-col items-center justify-center gap-4 px-4 py-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface">
          <Bot className="h-5 w-5 text-text-muted" />
        </div>
        <p className="text-[13px] font-medium text-text-secondary">Start a conversation</p>
        <p className="text-[11px] text-text-muted">Ask a question or use a slash command to get started.</p>
        {onCtaAction && <EmptyStateCTARow featureStatus={featureStatus} onAction={onCtaAction} dismissed={emptyStateDismissed} />}
      </div>
    );
  }

  return (
    <ConversationContent ref={contentRef} data-message-thread>
      {messages.map((msg) => (
        <div key={msg.id} className="flex flex-col gap-1.5">
          <Message message={msg} />
          {msg.role === "assistant" && msg.thinking && (
            <div className="pl-2">
              <ThinkingDisclosure thinking={msg.thinking} streaming={msg.id === streamingAssistantId && isStreaming} />
            </div>
          )}
          {msg.toolCalls && msg.toolCalls.length > 0 && (
            <div className="flex flex-col gap-1 pl-2">
              <ToolCallGroup toolCalls={msg.toolCalls} onStageTransition={onStageTransition} />
            </div>
          )}
          {msg.role === "assistant" && msg.ctaSuggestions && msg.ctaSuggestions.length > 0 && onCtaAction && (
            <CTASuggestionRow suggestions={msg.ctaSuggestions} active={msg.ctaActive ?? false} onAction={onCtaAction} />
          )}
        </div>
      ))}
      {(isStreaming || status === "connecting") &&
        (() => {
          const streamingMsg = streamingAssistantId ? messages.find((m) => m.id === streamingAssistantId) : null;
          const hasThinking = Boolean(streamingMsg?.thinking);
          return !hasThinking ? (
            <div className="flex justify-start">
              <Loader />
            </div>
          ) : null;
        })()}
    </ConversationContent>
  );
}

type ToolCallRowProps = {
  toolCall: ToolCallEntry;
  onStageTransition?: () => void;
};

const TOOL_LABELS: Record<string, string> = {
  execute_code: "Ran code",
  workflow_request_approval: "Requested approval",
  workflow_edit_document: "Edited document",
  workflow_write_product_spec: "Wrote product spec",
  workflow_write_technical_design: "Wrote technical design",
};

function toolLabel(name: string): string {
  if (TOOL_LABELS[name]) return TOOL_LABELS[name];
  const spaced = name.replace(/_/g, " ").trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : "Tool call";
}

function formatOutput(output: unknown): string {
  if (typeof output === "string") return output;
  try {
    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
}

type ToolCallGroupProps = {
  toolCalls: ToolCallEntry[];
  onStageTransition?: () => void;
};

/**
 * Collapses a turn's tool calls into a single line. While the agent is working
 * it shows the current (last) tool with a spinner; once finished it collapses
 * to a "N tool calls" summary. Either way it expands to the full list on click.
 *
 * Interactive cards (approval, document edits) are pulled out and always
 * rendered in full — they carry actionable UI that shouldn't be hidden.
 */
function ToolCallGroup({ toolCalls, onStageTransition }: ToolCallGroupProps) {
  const [expanded, setExpanded] = useState(false);

  const cards: ToolCallEntry[] = [];
  const steps: ToolCallEntry[] = [];
  for (const tc of toolCalls) {
    if (tc.status === "done" && tc.output != null) {
      if (tc.name === "workflow_request_approval" && extractApprovalOutput(tc.output)) {
        cards.push(tc);
        continue;
      }
      if (DOCUMENT_EDIT_TOOLS.has(tc.name) && extractDocumentEditOutput(tc.output)) {
        cards.push(tc);
        continue;
      }
    }
    steps.push(tc);
  }

  const renderedCards = cards.map((tc) => <ToolCallRow key={tc.callId} toolCall={tc} onStageTransition={onStageTransition} />);

  if (steps.length === 0) {
    return <>{renderedCards}</>;
  }

  const running = steps.some((tc) => tc.status === "running");
  const last = steps[steps.length - 1];
  const summary = running ? toolLabel(last.name) : `${steps.length} tool ${steps.length === 1 ? "call" : "calls"}`;

  return (
    <>
      <div data-tool-call-group data-running={running} className="flex flex-col">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="group flex items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-xs text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-secondary"
        >
          {running ? <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden="true" /> : <Wrench className="h-3 w-3 shrink-0" aria-hidden="true" />}
          <span className="font-medium">{summary}</span>
          {running && <span className="text-text-muted/70">…</span>}
          <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} aria-hidden="true" />
        </button>
        {expanded && (
          <div className="mt-1 flex flex-col gap-1 border-l border-border pl-2.5">
            {steps.map((tc) => (
              <ToolCallRow key={tc.callId} toolCall={tc} onStageTransition={onStageTransition} />
            ))}
          </div>
        )}
      </div>
      {renderedCards}
    </>
  );
}

function ToolCallRow({ toolCall, onStageTransition }: ToolCallRowProps) {
  const { name, status, output } = toolCall;
  const [expanded, setExpanded] = useState(false);

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

  const isRunning = status === "running";
  const hasOutput = status === "done" && output !== undefined && output !== null && formatOutput(output).trim().length > 0;

  return (
    <div data-tool-call data-status={status} className="flex flex-col">
      <button
        type="button"
        disabled={!hasOutput}
        onClick={() => hasOutput && setExpanded((v) => !v)}
        aria-expanded={hasOutput ? expanded : undefined}
        className={`group flex items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-xs text-text-muted transition-colors ${
          hasOutput ? "cursor-pointer hover:bg-surface-secondary hover:text-text-secondary" : "cursor-default"
        }`}
      >
        {isRunning ? <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden="true" /> : <Wrench className="h-3 w-3 shrink-0" aria-hidden="true" />}
        <span className="font-medium">{toolLabel(name)}</span>
        {isRunning && <span className="text-text-muted/70">…</span>}
        {hasOutput && <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} aria-hidden="true" />}
      </button>
      {hasOutput && expanded && (
        <pre className="mt-1 max-h-64 overflow-auto rounded-md border border-border bg-surface-secondary px-2.5 py-2 text-[11px] leading-relaxed text-text-secondary">{formatOutput(output)}</pre>
      )}
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
  return {
    feature_id: req.feature_id,
    stage: req.stage,
    review_status: req.review_status,
  };
}

function extractDocumentEditOutput(output: unknown): DocumentEditOutput | null {
  if (!output || typeof output !== "object") return null;
  return output as DocumentEditOutput;
}
