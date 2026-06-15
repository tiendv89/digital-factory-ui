"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

type MarkdownCodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  dataAttr?: string;
};

// Shared text metrics — the highlighted layer and the transparent textarea MUST
// use identical font/padding/wrapping so the caret lines up with the rendered text.
const FONT_FAMILY = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
const FONT_SIZE = "13px";
const LINE_HEIGHT = "20px";
const PADDING = "16px";

// MarkdownCodeEditor is an editable, syntax-highlighted markdown editor. A
// read-only react-syntax-highlighter renders the highlighted markdown while a
// transparent <textarea> overlaid on top captures input. Because both layers
// share the same metrics and word-wrapping, they grow to the same height and the
// caret/selection align with the highlighted glyphs without any scroll syncing.
export function MarkdownCodeEditor({ value, onChange, ariaLabel, dataAttr }: MarkdownCodeEditorProps) {
  const taAttrs: Record<string, string> = dataAttr ? { [dataAttr]: "" } : {};
  return (
    <div className="relative min-h-[60vh] w-full bg-surface">
      <SyntaxHighlighter
        language="markdown"
        style={vscDarkPlus}
        wrapLongLines
        aria-hidden="true"
        customStyle={{
          margin: 0,
          padding: PADDING,
          minHeight: "60vh",
          background: "transparent",
          fontSize: FONT_SIZE,
          lineHeight: LINE_HEIGHT,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          overflow: "visible",
        }}
        codeTagProps={{ style: { fontFamily: FONT_FAMILY, fontSize: FONT_SIZE, lineHeight: LINE_HEIGHT } }}
      >
        {value.length > 0 ? value : " "}
      </SyntaxHighlighter>
      <textarea
        {...taAttrs}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        aria-label={ariaLabel}
        wrap="soft"
        className="absolute inset-0 h-full w-full resize-none overflow-hidden border-0 bg-transparent text-transparent caret-text-primary outline-none focus:ring-0"
        style={{
          margin: 0,
          padding: PADDING,
          fontFamily: FONT_FAMILY,
          fontSize: FONT_SIZE,
          lineHeight: LINE_HEIGHT,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          caretColor: "var(--color-text-primary)",
        }}
      />
    </div>
  );
}
