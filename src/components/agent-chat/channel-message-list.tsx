"use client";

import { Popover } from "@heroui/react";
import { Bot } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

import { deriveIconColor } from "@/components/settings/icon-colors";

import { ConversationContent, useConversationScroll } from "./conversation";
import { CTASuggestionRow } from "./cta-suggestion-row";
import { EmptyStateCTARow } from "./empty-state-cta-row";
import { Loader } from "./loader";
import { MessageContent, UserMessageContent } from "./message";
import type { ChatStatus, HermesMessage } from "./types";

/** Resolved display identity for a channel message author. */
export type ChannelAuthor = {
  id?: string;
  name: string;
  handle?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  roleLabel?: string | null;
  isAgent: boolean;
};

type ChannelMessageListProps = {
  messages: HermesMessage[];
  status: ChatStatus;
  /** Resolve a message to its display author (name + avatar). */
  resolveAuthor: (msg: HermesMessage) => ChannelAuthor;
  onCtaAction?: (actionText: string) => void;
  featureStatus?: string | null;
  emptyStateDismissed?: boolean;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function Avatar({ author, size = 36 }: { author: ChannelAuthor; size?: number }) {
  const cls = "shrink-0 rounded-full";
  if (author.isAgent) {
    return (
      <div className={`${cls} flex items-center justify-center bg-primary/15`} style={{ width: size, height: size }} aria-label="Hermes agent">
        <Bot className="text-primary" style={{ width: size * 0.5, height: size * 0.5 }} aria-hidden="true" />
      </div>
    );
  }
  if (author.avatarUrl) {
    return <img src={author.avatarUrl} alt={author.name} className={`${cls} object-cover`} style={{ width: size, height: size }} />;
  }
  return (
    <div
      className={`${cls} flex items-center justify-center font-semibold text-white`}
      style={{ width: size, height: size, fontSize: size * 0.32, background: deriveIconColor(author.id ?? author.name) }}
      aria-label={author.name}
    >
      {initials(author.name)}
    </div>
  );
}

/** Discord-style profile card shown when a member's avatar/name is clicked. */
function ProfileCard({ author }: { author: ChannelAuthor }) {
  const banner = author.isAgent ? "var(--color-primary, #007acc)" : deriveIconColor(author.id ?? author.name);
  return (
    <div className="w-72 overflow-hidden rounded-xl border" style={{ backgroundColor: "#2d2d2d", borderColor: "#454545", boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}>
      <div className="h-[60px]" style={{ background: banner }} />
      <div className="px-4 pb-4">
        <div className="-mt-9 mb-2 w-fit rounded-full p-1" style={{ backgroundColor: "#2d2d2d" }}>
          <Avatar author={author} size={64} />
        </div>
        <div className="text-[15px] font-bold text-text-primary">{author.name}</div>
        {author.handle && <div className="text-[12px] text-text-muted">@{author.handle}</div>}
        {author.isAgent && <div className="text-[12px] text-text-muted">AI assistant</div>}

        {(author.email || author.roleLabel) && (
          <div className="mt-3 flex flex-col gap-3 rounded-lg bg-black/20 p-3">
            {author.email && (
              <div>
                <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Email</div>
                <div className="truncate text-[12px] text-text-secondary">{author.email}</div>
              </div>
            )}
            {author.roleLabel && (
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Role</div>
                <span className="inline-flex items-center rounded bg-white/8 px-2 py-0.5 text-[11px] font-medium capitalize text-text-secondary">{author.roleLabel}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Wraps avatar/name as a clickable trigger that opens the profile card.
 * No-op (renders children plainly) for the agent or unresolved authors. */
function ProfileTrigger({ author, className, children }: { author: ChannelAuthor; className?: string; children: ReactNode }) {
  if (author.isAgent || !author.id) return <>{children}</>;
  return (
    <Popover>
      <Popover.Trigger>
        <button type="button" className={`cursor-pointer rounded text-left transition-opacity hover:opacity-80 focus:outline-none ${className ?? ""}`}>
          {children}
        </button>
      </Popover.Trigger>
      <Popover.Content placement="top start" className="border-0 bg-transparent p-0 shadow-none">
        <Popover.Dialog className="outline-none">
          <ProfileCard author={author} />
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
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
 * plain text with @mention chips. Clicking an avatar/name opens a profile card.
 */
export function ChannelMessageList({ messages, status, resolveAuthor, onCtaAction, featureStatus, emptyStateDismissed = false }: ChannelMessageListProps) {
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
  const showTyping = isStreaming;

  if (visible.length === 0 && !isStreaming && status !== "connecting") {
    return (
      <div data-channel-empty className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
        <div>
          <p className="text-[13px] font-medium text-text-secondary">No messages yet</p>
          <p className="text-[11px] text-text-muted">Say hello, or mention @agent to ask a question.</p>
        </div>
        {onCtaAction && (
          <EmptyStateCTARow featureStatus={featureStatus} onAction={onCtaAction} dismissed={emptyStateDismissed} />
        )}
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
            {!grouped && (
              <ProfileTrigger author={author}>
                <Avatar author={author} />
              </ProfileTrigger>
            )}
            <div className="min-w-0 flex-1">
              {!grouped && (
                <div className="mb-0.5 flex items-baseline gap-2">
                  <ProfileTrigger author={author}>
                    <span className={`text-[13px] font-semibold ${author.isAgent ? "text-primary" : "text-text-primary"}`}>{author.name}</span>
                  </ProfileTrigger>
                  {msg.createdAt ? <span className="text-[11px] text-text-muted">{formatTime(msg.createdAt)}</span> : null}
                </div>
              )}
              {msg.role === "assistant" ? (
                <>
                  <MessageContent content={msg.content} />
                  {(msg.ctaSuggestions?.length ?? 0) > 0 && onCtaAction && (
                    <div className="mt-2">
                      <CTASuggestionRow
                        suggestions={msg.ctaSuggestions ?? []}
                        active={msg.ctaActive ?? false}
                        onAction={onCtaAction}
                      />
                    </div>
                  )}
                </>
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
