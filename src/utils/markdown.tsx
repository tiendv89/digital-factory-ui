"use client";

import { isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

function getCodeBlockLanguage(children: ReactNode): string | undefined {
  const child = Array.isArray(children) ? children.find((item) => isValidElement(item)) : children;

  if (!isValidElement<{ className?: string }>(child)) return undefined;

  return child.props.className?.match(/language-(\S+)/)?.[1];
}

/**
 * Renders markdown content using react-markdown with GitHub Flavored Markdown
 * support (tables, strikethrough, task lists, autolinks).
 */
export function MarkdownContent({ content, className }: { content: string; className?: string }) {
  return (
    <div data-markdown-content className={"markdown-body " + (className ?? "")}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          a: ({ node, href, children, ...props }) => {
            void node;
            return (
              <a {...props} href={href} target="_blank" rel="noreferrer noopener">
                {children}
              </a>
            );
          },
          pre: ({ node, children, ...props }) => {
            void node;
            return (
              <pre {...props} data-code-block={getCodeBlockLanguage(children)}>
                {children}
              </pre>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
