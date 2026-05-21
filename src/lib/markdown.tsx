import React from "react";

type InlineNode =
  | { kind: "text"; text: string }
  | { kind: "bold"; children: InlineNode[] }
  | { kind: "italic"; children: InlineNode[] }
  | { kind: "code"; text: string }
  | { kind: "link"; href: string; children: InlineNode[] };

function parseInlineNodes(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let i = 0;

  while (i < text.length) {
    // Bold: **text** or __text__
    if (
      (text[i] === "*" && text[i + 1] === "*") ||
      (text[i] === "_" && text[i + 1] === "_")
    ) {
      const marker = text.slice(i, i + 2);
      const end = text.indexOf(marker, i + 2);
      if (end !== -1) {
        nodes.push({
          kind: "bold",
          children: parseInlineNodes(text.slice(i + 2, end)),
        });
        i = end + 2;
        continue;
      }
    }

    // Italic: *text* or _text_
    if (text[i] === "*" || text[i] === "_") {
      const marker = text[i];
      const end = text.indexOf(marker, i + 1);
      if (end !== -1 && text[end - 1] !== marker) {
        nodes.push({
          kind: "italic",
          children: parseInlineNodes(text.slice(i + 1, end)),
        });
        i = end + 1;
        continue;
      }
    }

    // Inline code: `text`
    if (text[i] === "`") {
      const end = text.indexOf("`", i + 1);
      if (end !== -1) {
        nodes.push({ kind: "code", text: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // Link: [label](url)
    if (text[i] === "[") {
      const labelEnd = text.indexOf("]", i + 1);
      if (labelEnd !== -1 && text[labelEnd + 1] === "(") {
        const hrefEnd = text.indexOf(")", labelEnd + 2);
        if (hrefEnd !== -1) {
          nodes.push({
            kind: "link",
            href: text.slice(labelEnd + 2, hrefEnd),
            children: parseInlineNodes(text.slice(i + 1, labelEnd)),
          });
          i = hrefEnd + 1;
          continue;
        }
      }
    }

    // Accumulate plain text
    const last = nodes[nodes.length - 1];
    if (last?.kind === "text") {
      last.text += text[i];
    } else {
      nodes.push({ kind: "text", text: text[i] });
    }
    i++;
  }

  return nodes;
}

function renderInlineNodes(
  nodes: InlineNode[],
  keyPrefix: string,
): React.ReactNode[] {
  return nodes.map((node, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (node.kind === "text") return node.text;
    if (node.kind === "bold")
      return (
        <strong key={key}>{renderInlineNodes(node.children, key)}</strong>
      );
    if (node.kind === "italic")
      return <em key={key}>{renderInlineNodes(node.children, key)}</em>;
    if (node.kind === "code")
      return (
        <code
          key={key}
          className="rounded bg-surface-secondary px-1 font-mono text-[0.85em]"
        >
          {node.text}
        </code>
      );
    if (node.kind === "link")
      return (
        <a
          key={key}
          href={node.href}
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary underline"
        >
          {renderInlineNodes(node.children, key)}
        </a>
      );
    return null;
  });
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return renderInlineNodes(parseInlineNodes(text), keyPrefix);
}

type BlockNode =
  | { kind: "heading"; level: 1 | 2 | 3 | 4; text: string }
  | { kind: "hr" }
  | { kind: "code_block"; lang: string; text: string }
  | { kind: "blockquote"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "paragraph"; lines: string[] };

function parseBlocks(markdown: string): BlockNode[] {
  const lines = markdown.split("\n");
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ kind: "code_block", lang, text: codeLines.join("\n") });
      continue;
    }

    // Horizontal rule
    if (/^[\-*_]{3,}\s*$/.test(line.trim())) {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,4})\s+(.*)/);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 4) as 1 | 2 | 3 | 4;
      blocks.push({ kind: "heading", level, text: headingMatch[2].trim() });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const bqLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        bqLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ kind: "blockquote", lines: bqLines });
      continue;
    }

    // Unordered list
    if (/^[\-*+] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\-*+] /.test(lines[i])) {
        items.push(lines[i].replace(/^[\-*+] /, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    // Empty line — skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph: accumulate non-empty lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("> ") &&
      !/^[\-*+] /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i]) &&
      !/^[\-*_]{3,}\s*$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ kind: "paragraph", lines: paraLines });
    }
  }

  return blocks;
}

function renderBlock(block: BlockNode, idx: number): React.ReactNode {
  const key = `block-${idx}`;

  if (block.kind === "hr") {
    return <hr key={key} className="my-4 border-border" />;
  }

  if (block.kind === "heading") {
    const text = renderInline(block.text, key);
    const cls = "font-semibold text-text-primary mt-6 mb-2";
    if (block.level === 1)
      return (
        <h1 key={key} className={`text-2xl ${cls}`}>
          {text}
        </h1>
      );
    if (block.level === 2)
      return (
        <h2 key={key} className={`text-xl ${cls}`}>
          {text}
        </h2>
      );
    if (block.level === 3)
      return (
        <h3 key={key} className={`text-base ${cls}`}>
          {text}
        </h3>
      );
    return (
      <h4 key={key} className={`text-sm ${cls}`}>
        {text}
      </h4>
    );
  }

  if (block.kind === "code_block") {
    return (
      <pre
        key={key}
        data-code-block={block.lang || undefined}
        className="my-4 overflow-x-auto rounded bg-surface-secondary px-4 py-3 font-mono text-xs text-text-secondary"
      >
        {block.text}
      </pre>
    );
  }

  if (block.kind === "blockquote") {
    return (
      <blockquote
        key={key}
        className="my-3 border-l-4 border-border pl-4 text-sm italic text-text-secondary"
      >
        {block.lines.map((line, li) => (
          <p key={li}>{renderInline(line, `${key}-bq-${li}`)}</p>
        ))}
      </blockquote>
    );
  }

  if (block.kind === "ul") {
    return (
      <ul key={key} className="my-3 list-disc space-y-1 pl-5 text-sm text-text-primary">
        {block.items.map((item, ii) => (
          <li key={ii}>{renderInline(item, `${key}-li-${ii}`)}</li>
        ))}
      </ul>
    );
  }

  if (block.kind === "ol") {
    return (
      <ol key={key} className="my-3 list-decimal space-y-1 pl-5 text-sm text-text-primary">
        {block.items.map((item, ii) => (
          <li key={ii}>{renderInline(item, `${key}-li-${ii}`)}</li>
        ))}
      </ol>
    );
  }

  if (block.kind === "paragraph") {
    return (
      <p key={key} className="my-2 text-sm leading-relaxed text-text-primary">
        {block.lines.map((line, li) => (
          <React.Fragment key={li}>
            {li > 0 && <br />}
            {renderInline(line, `${key}-p-${li}`)}
          </React.Fragment>
        ))}
      </p>
    );
  }

  return null;
}

export function MarkdownContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const blocks = parseBlocks(content);
  return (
    <div
      data-markdown-content
      className={"prose-sm max-w-none " + (className ?? "")}
    >
      {blocks.map((block, idx) => renderBlock(block, idx))}
    </div>
  );
}
