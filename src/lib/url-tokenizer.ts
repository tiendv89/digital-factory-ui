export type TextToken = { type: "text"; value: string };
export type LinkToken = { type: "link"; href: string; label: string };
export type Token = TextToken | LinkToken;

function isValidUrl(candidate: string): boolean {
  try {
    const u = new URL(candidate);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function trimTrailingPunctuation(s: string): string {
  let end = s.length;
  while (end > 0) {
    const ch = s[end - 1];
    if (ch === "." || ch === "," || ch === ")" || ch === "]" || ch === '"' || ch === "'") {
      end--;
    } else {
      break;
    }
  }
  return s.slice(0, end);
}

// Regex-based tokenizer: preserves original text slices (including surrounding
// spaces) so that adjacent text and link tokens render without losing whitespace.
export function tokenizeText(text: string): Token[] {
  const URL_REGEX = /https?:\/\/\S+/g;
  const tokens: Token[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = URL_REGEX.exec(text)) !== null) {
    const rawUrl = match[0];
    const trimmedUrl = trimTrailingPunctuation(rawUrl);
    const trailing = rawUrl.slice(trimmedUrl.length);
    const start = match.index;
    const end = start + rawUrl.length;

    if (start > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, start) });
    }

    if (isValidUrl(trimmedUrl)) {
      tokens.push({ type: "link", href: trimmedUrl, label: trimmedUrl });
      if (trailing) {
        tokens.push({ type: "text", value: trailing });
      }
    } else {
      tokens.push({ type: "text", value: rawUrl });
    }

    lastIndex = end;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }

  return tokens.filter((t) => t.type !== "text" || (t as TextToken).value !== "");
}
