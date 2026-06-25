"use client";

import { User } from "lucide-react";
import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { Badge } from "@/components/common/badge";

import type { HermesMessage, MessageAuthor } from "./types";

/**
 * A minimal remark plugin that transforms `@handle` text tokens outside code
 * blocks into inline HTML spans so they render as styled mention chips.
 */
function remarkMentions() {
  return (tree: { type: string; children?: unknown[] }) => {
    function walk(node: { type: string; children?: unknown[]; value?: string }) {
      if (!node.children) return;
      const newChildren: unknown[] = [];
      for (const child of node.children) {
        const c = child as { type: string; children?: unknown[]; value?: string };
        if (c.type === "code" || c.type === "inlineCode") {
          newChildren.push(c);
          continue;
        }
        if (c.type === "text" && typeof c.value === "string") {
          const parts = c.value.split(/(@[a-zA-Z0-9_-]+)/g);
          if (parts.length > 1) {
            for (const part of parts) {
              if (!part) continue;
              if (/^@[a-zA-Z0-9_-]+$/.test(part)) {
                const handle = part.slice(1);
                const isAgent = handle === "agent";
                const cls = isAgent
                  ? "inline-flex items-center rounded px-1 py-px text-[11px] font-semibold bg-primary/15 text-primary border border-primary/25 no-underline"
                  : "inline-flex items-center rounded px-1 py-px text-[11px] font-semibold bg-surface-secondary text-text-secondary border border-border no-underline";
                newChildren.push({
                  type: "html",
                  value: `<span class="${cls}" data-mention data-handle="${handle}" aria-label="mention ${handle}">@${handle}</span>`,
                });
              } else {
                newChildren.push({ type: "text", value: part });
              }
            }
            continue;
          }
        }
        walk(c);
        newChildren.push(c);
      }
      node.children = newChildren;
    }
    walk(tree as { type: string; children?: unknown[]; value?: string });
  };
}

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="agent-fade-in mt-4 mb-2 text-base font-semibold text-text-primary first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="agent-fade-in mt-4 mb-2 text-sm font-semibold text-text-primary first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="agent-fade-in mt-3 mb-1.5 text-[13px] font-semibold text-text-primary first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="agent-fade-in my-2 leading-relaxed text-text-primary first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 text-text-primary marker:text-text-muted">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 text-text-primary marker:text-text-muted">{children}</ol>,
  li: ({ children }) => <li className="agent-fade-in leading-relaxed">{children}</li>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80">
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-border pl-3 text-text-secondary">{children}</blockquote>,
  hr: () => <hr className="my-3 border-border" />,
  code: ({ className, children }) => {
    const isBlock = (className ?? "").includes("language-");
    if (isBlock) {
      return <code className={`${className ?? ""} font-mono text-[12px]`}>{children}</code>;
    }
    return <code className="rounded bg-surface-secondary px-1 py-0.5 font-mono text-[12px] text-text-primary">{children}</code>;
  },
  pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-md border border-border bg-surface-secondary p-3 text-[12px] leading-relaxed text-text-primary">{children}</pre>,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-border px-2 py-1 text-left font-semibold text-text-primary">{children}</th>,
  td: ({ children }) => <td className="border border-border px-2 py-1 text-text-secondary">{children}</td>,
};

/**
 * Render user message text with `@handle` tokens highlighted as pill-shaped spans.
 * User messages are plain text (not markdown), so we split by the @handle pattern
 * and render each segment directly.
 */
export function UserMessageContent({ content }: { content: string }) {
  const parts = content.split(/(@[a-zA-Z0-9_-]+)/g);
  if (parts.length === 1) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (/^@[a-zA-Z0-9_-]+$/.test(part)) {
          return (
            <span key={i} data-mention data-handle={part.slice(1)} className="rounded bg-white/20 px-1 py-px font-semibold">
              {part}
            </span>
          );
        }
        return part;
      })}
    </span>
  );
}

export function MessageContent({ content }: { content: string }) {
  return (
    <div data-message-content className="max-w-none text-sm text-text-primary">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMentions]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

function AuthorAvatar({ author }: { author?: MessageAuthor }) {
  if (author?.avatarUrl) {
    return <img src={author.avatarUrl} alt={author.name} className="h-6 w-6 shrink-0 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-secondary" aria-label={author?.name ?? "User"}>
      <User className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
    </div>
  );
}

function AuthorLabel({ author }: { author?: MessageAuthor }) {
  if (!author) return null;
  return (
    <span className="text-[11px] font-medium text-text-secondary" data-author-human>
      {author.name}
      {author.roleLabel && <span className="ml-1 text-text-muted">· {author.roleLabel}</span>}
    </span>
  );
}

export const Message = memo(function Message({ message }: { message: HermesMessage }) {
  const isUser = message.role === "user";
  const isAgent = message.role === "assistant";
  const hasAuthor = !!message.author;
  const isStopped = message.finishReason === "stopped";
  const hasCredits = isAgent && typeof message.creditsUsed === "number";

  if (!message.content.trim()) {
    return null;
  }

  if (isUser) {
    return (
      <div data-message data-role="user" className="flex w-full flex-col items-end gap-1">
        <div className="max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-white">
          <UserMessageContent content={message.content} />
        </div>
      </div>
    );
  }

  return (
    <div data-message data-role="assistant" className="flex w-full flex-col gap-1">
      {hasAuthor && !isAgent && (
        <div className="flex items-center gap-1.5">
          <AuthorAvatar author={message.author} />
          <AuthorLabel author={message.author} />
        </div>
      )}
      <div className={`w-full max-w-none text-sm text-text-primary ${hasAuthor && !isAgent ? "pl-7" : ""}`}>
        <MessageContent content={message.content} />
        <div className="mt-1.5 flex items-center gap-1.5">
          {isStopped && (
            <span data-stopped-indicator className="text-xs text-text-muted">
              — stopped
            </span>
          )}
          {hasCredits && (
            <Badge tone="neutral" data-credit-badge aria-label={`${message.creditsUsed} ${message.creditsUsed === 1 ? "credit" : "credits"}`}>
              {message.creditsUsed} {message.creditsUsed === 1 ? "credit" : "credits"}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
});
