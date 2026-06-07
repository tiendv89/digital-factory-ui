"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { HermesMessage } from "./types";

export function MessageContent({ content }: { content: string }) {
  return (
    <div data-message-content className="prose prose-sm max-w-none text-text-primary">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

export function Message({ message }: { message: HermesMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      data-message
      data-role={message.role}
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-primary text-white"
            : "bg-surface-secondary text-text-primary"
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <MessageContent content={message.content} />
        )}
      </div>
    </div>
  );
}
