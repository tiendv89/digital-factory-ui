// Minimal type declarations for react-syntax-highlighter (no official @types installed).
declare module "react-syntax-highlighter" {
  import type { CSSProperties, ReactNode } from "react";

  export interface SyntaxHighlighterProps {
    language?: string;
    style?: Record<string, CSSProperties>;
    customStyle?: CSSProperties;
    codeTagProps?: { style?: CSSProperties; [key: string]: unknown };
    wrapLongLines?: boolean;
    wrapLines?: boolean;
    showLineNumbers?: boolean;
    PreTag?: keyof JSX.IntrinsicElements | React.ComponentType<unknown>;
    CodeTag?: keyof JSX.IntrinsicElements | React.ComponentType<unknown>;
    children?: ReactNode;
    [key: string]: unknown;
  }

  export const Prism: React.ComponentType<SyntaxHighlighterProps>;
  export const Light: React.ComponentType<SyntaxHighlighterProps>;
  const SyntaxHighlighter: React.ComponentType<SyntaxHighlighterProps>;
  export default SyntaxHighlighter;
}

declare module "react-syntax-highlighter/dist/esm/styles/prism" {
  import type { CSSProperties } from "react";
  const styles: { [key: string]: Record<string, CSSProperties> };
  export const vscDarkPlus: Record<string, CSSProperties>;
  export const oneDark: Record<string, CSSProperties>;
  export default styles;
}
