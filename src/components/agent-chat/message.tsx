"use client";

import { Bot, User } from "lucide-react";
import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import type { HermesMessage, MessageAuthor } from "./types";

// Explicit element styles so the transcript stays readable regardless of
// whether the Tailwind typography (`prose`) plugin is active. Tuned for a
// dark surface: clear heading hierarchy, comfortable spacing, legible code.
const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="mt-4 mb-2 text-base font-semibold text-text-primary first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-4 mb-2 text-sm font-semibold text-text-primary first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-3 mb-1.5 text-[13px] font-semibold text-text-primary first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="my-2 leading-relaxed text-text-primary first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 text-text-primary marker:text-text-muted">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 text-text-primary marker:text-text-muted">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
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

function MessageContent({ content }: { content: string }) {
  return (
    <div data-message-content className="max-w-none text-sm text-text-primary">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

function AuthorAvatar({ author, isAgent }: { author?: MessageAuthor; isAgent?: boolean }) {
  if (isAgent) {
    return (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10" aria-label="Hermes agent">
        <Bot className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      </div>
    );
  }
  if (author?.avatarUrl) {
    return <img src={author.avatarUrl} alt={author.name} className="h-6 w-6 shrink-0 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-secondary" aria-label={author?.name ?? "User"}>
      <User className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
    </div>
  );
}

function AuthorLabel({ author, isAgent }: { author?: MessageAuthor; isAgent?: boolean }) {
  if (isAgent) {
    return (
      <span className="text-[11px] font-medium text-primary" data-author-agent>
        @agent
      </span>
    );
  }
  if (!author) return null;
  return (
    <span className="text-[11px] font-medium text-text-secondary" data-author-human>
      {author.name}
      {author.roleLabel && <span className="ml-1 text-text-muted">· {author.roleLabel}</span>}
    </span>
  );
}

// Memoized so that while one message streams, the already-rendered messages
// (whose object reference is unchanged) skip re-rendering — and crucially skip
// re-parsing their markdown — on every animation-frame flush.
export const Message = memo(function Message({ message }: { message: HermesMessage }) {
  const isUser = message.role === "user";
  const isAgent = message.role === "assistant";
  const hasAuthor = !!message.author;

  // Skip the bubble entirely for empty content (e.g. an assistant turn that
  // only produced tool calls) — an empty bubble is just visual noise.
  if (!message.content.trim()) {
    return null;
  }

  // User turns keep a bubble; the agent's replies render flat (no background)
  // so the transcript reads like a document, matching the Claude UI.
  if (isUser) {
    return (
      <div data-message data-role="user" className="flex w-full flex-col items-end gap-1">
        {hasAuthor && (
          <div className="flex items-center gap-1.5">
            <AuthorLabel author={message.author} />
            <AuthorAvatar author={message.author} />
          </div>
        )}
        <div className="max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-white">
          <span className="whitespace-pre-wrap">{message.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div data-message data-role="assistant" className="flex w-full flex-col gap-1">
      {(hasAuthor || isAgent) && (
        <div className="flex items-center gap-1.5">
          <AuthorAvatar isAgent={isAgent} />
          <AuthorLabel isAgent={isAgent} />
        </div>
      )}
      <div className={`w-full max-w-none text-sm text-text-primary ${hasAuthor || isAgent ? "pl-7" : ""}`}>
        <MessageContent content={message.content} />
      </div>
    </div>
  );
});
