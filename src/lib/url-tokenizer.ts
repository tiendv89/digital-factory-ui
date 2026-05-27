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

function pushText(tokens: Token[], value: string): void {
  const v = value.trim();
  if (v) tokens.push({ type: "text", value: v });
}

export function tokenizeText(text: string): Token[] {
  const words = text.split(" ");
  const tokens: Token[] = [];
  const pendingWords: string[] = [];

  for (const word of words) {
    if (word.startsWith("http://") || word.startsWith("https://")) {
      const trimmed = trimTrailingPunctuation(word);
      const trailing = word.slice(trimmed.length);

      if (isValidUrl(trimmed)) {
        if (pendingWords.length > 0) {
          pushText(tokens, pendingWords.join(" "));
          pendingWords.length = 0;
        }
        tokens.push({ type: "link", href: trimmed, label: trimmed });
        if (trailing) {
          pendingWords.push(trailing);
        }
      } else {
        pendingWords.push(word);
      }
    } else if (word !== "") {
      pendingWords.push(word);
    }
  }

  if (pendingWords.length > 0) {
    pushText(tokens, pendingWords.join(" "));
  }

  return tokens;
}
