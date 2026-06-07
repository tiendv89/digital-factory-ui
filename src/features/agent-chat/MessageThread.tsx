"use client";

import { useEffect, useRef } from "react";
import { Wrench } from "lucide-react";
import { ConversationContent, useConversationScroll } from "./Conversation";
import { Message } from "./Message";
import { Loader } from "./Loader";
import type { HermesMessage, ChatStatus } from "./types";

type MessageThreadProps = {
  messages: HermesMessage[];
  status: ChatStatus;
};

export function MessageThread({ messages, status }: MessageThreadProps) {
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
      <div
        data-message-thread-empty
        className="flex flex-1 items-center justify-center px-4 text-center"
      >
        <p className="text-sm text-text-muted">
          Ask a question or use a slash command to get started.
        </p>
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
                <ToolCallRow key={tc.callId} name={tc.name} status={tc.status} />
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

function ToolCallRow({
  name,
  status,
}: {
  name: string;
  status: "running" | "done";
}) {
  return (
    <div
      data-tool-call
      className="flex items-center gap-1.5 text-xs text-text-muted"
    >
      <Wrench className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="font-mono">{name}</span>
      {status === "running" && (
        <span className="text-text-muted">(running…)</span>
      )}
      {status === "done" && (
        <span className="text-success">(done)</span>
      )}
    </div>
  );
}
