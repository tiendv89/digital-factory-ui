"use client";

import { Bot } from "lucide-react";
import { useEffect, useRef } from "react";

import { ConversationContent, useConversationScroll } from "./conversation";
import { Loader } from "./loader";
import { MessageContent, UserMessageContent } from "./message";
import type { ChatStatus, HermesMessage } from "./types";

/** Resolved display identity for a channel message author. */
export type ChannelAuthor = { name: string; avatarUrl?: string | null; isAgent: boolean };

type ChannelMessageListProps = {
  messages: HermesMessage[];
  status: ChatStatus;
  /** Resolve a message to its display author (name + avatar). */
  resolveAuthor: (msg: HermesMessage) => ChannelAuthor;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function Avatar({ author }: { author: ChannelAuthor }) {
  if (author.isAgent) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15" aria-label="Hermes agent">
        <Bot className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
      </div>
    );
  }
  if (author.avatarUrl) {
    return <img src={author.avatarUrl} alt={author.name} className="h-9 w-9 shrink-0 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-[11px] font-semibold text-text-secondary" aria-label={author.name}>
      {initials(author.name)}
    </div>
  );
}

function formatTime(epochSeconds?: number): string {
  if (!epochSeconds) return "";
  const d = new Date(epochSeconds * 1000);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * Discord-style channel transcript: consecutive messages from the same author
 * are grouped under a single avatar + name header; subsequent lines indent to
 * align with the first. Agent replies render as markdown; human messages as
 * plain text with @mention chips.
 */
export function ChannelMessageList({ messages, status, resolveAuthor }: ChannelMessageListProps) {
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

  const visible = messages.filter((m) => m.content.trim().length > 0);
  // Only show the "agent is typing" indicator while the agent is actually
  // streaming — not on initial load/connect (a channel is async; connecting
  // doesn't mean the agent is replying).
  const showTyping = isStreaming;

  if (visible.length === 0 && !isStreaming && status !== "connecting") {
    return (
      <div data-channel-empty className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-[13px] font-medium text-text-secondary">No messages yet</p>
        <p className="text-[11px] text-text-muted">Say hello, or mention @agent to ask a question.</p>
      </div>
    );
  }

  return (
    <ConversationContent ref={contentRef} data-channel-message-list>
      {visible.map((msg, i) => {
        const author = resolveAuthor(msg);
        const prev = i > 0 ? visible[i - 1] : null;
        const prevAuthor = prev ? resolveAuthor(prev) : null;
        const grouped = !!prevAuthor && prevAuthor.name === author.name && prevAuthor.isAgent === author.isAgent;

        return (
          <div key={msg.id} data-channel-message className={grouped ? "flex gap-3 pl-12" : "flex gap-3 pt-3"}>
            {!grouped && <Avatar author={author} />}
            <div className="min-w-0 flex-1">
              {!grouped && (
                <div className="mb-0.5 flex items-baseline gap-2">
                  <span className={`text-[13px] font-semibold ${author.isAgent ? "text-primary" : "text-text-primary"}`}>{author.name}</span>
                  {msg.createdAt ? <span className="text-[11px] text-text-muted">{formatTime(msg.createdAt)}</span> : null}
                </div>
              )}
              {msg.role === "assistant" ? (
                <MessageContent content={msg.content} />
              ) : (
                <div className="text-sm leading-relaxed text-text-primary">
                  <UserMessageContent content={msg.content} />
                </div>
              )}
            </div>
          </div>
        );
      })}
      {showTyping && (
        <div className="flex justify-start pl-12">
          <Loader />
        </div>
      )}
    </ConversationContent>
  );
}
