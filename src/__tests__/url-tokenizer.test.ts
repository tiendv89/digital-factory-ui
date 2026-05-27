import { describe, expect, it } from "vitest";
import { tokenizeText } from "../lib/url-tokenizer";

describe("tokenizeText", () => {
  it("returns a single text token for plain text with no URLs", () => {
    const tokens = tokenizeText("Hello world");
    expect(tokens).toEqual([{ type: "text", value: "Hello world" }]);
  });

  it("returns a single link token for a bare URL", () => {
    const tokens = tokenizeText("https://github.com/tiendv89/digital-factory-ui/pull/57");
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({
      type: "link",
      href: "https://github.com/tiendv89/digital-factory-ui/pull/57",
      label: "https://github.com/tiendv89/digital-factory-ui/pull/57",
    });
  });

  it("splits text and URL when URL appears mid-sentence", () => {
    const tokens = tokenizeText("See https://example.com for details");
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toEqual({ type: "text", value: "See" });
    expect(tokens[1]).toEqual({ type: "link", href: "https://example.com", label: "https://example.com" });
    expect(tokens[2]).toEqual({ type: "text", value: "for details" });
  });

  it("strips trailing period from URL", () => {
    const tokens = tokenizeText("Visit https://example.com.");
    const link = tokens.find((t) => t.type === "link");
    expect(link?.href).toBe("https://example.com");
  });

  it("strips trailing comma from URL", () => {
    const tokens = tokenizeText("Visit https://example.com, then go home.");
    const link = tokens.find((t) => t.type === "link");
    expect(link?.href).toBe("https://example.com");
  });

  it("handles http:// URLs", () => {
    const tokens = tokenizeText("See http://example.com here");
    const link = tokens.find((t) => t.type === "link");
    expect(link).toBeDefined();
    expect(link?.href).toBe("http://example.com");
  });

  it("treats a non-URL word starting with https:// as text if URL is invalid", () => {
    const tokens = tokenizeText("https://");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe("text");
  });

  it("handles multiple URLs in one string", () => {
    const tokens = tokenizeText(
      "PR at https://github.com/org/repo/pull/1 and https://github.com/org/repo/pull/2 done",
    );
    const links = tokens.filter((t) => t.type === "link");
    expect(links).toHaveLength(2);
    expect(links[0].href).toBe("https://github.com/org/repo/pull/1");
    expect(links[1].href).toBe("https://github.com/org/repo/pull/2");
  });

  it("returns empty array for empty string", () => {
    const tokens = tokenizeText("");
    expect(tokens).toHaveLength(0);
  });

  it("preserves surrounding text exactly around URL", () => {
    const tokens = tokenizeText("Before https://example.com/path after");
    const textBefore = tokens.find((t) => t.type === "text" && t.value.includes("Before"));
    const textAfter = tokens.find((t) => t.type === "text" && t.value.includes("after"));
    expect(textBefore?.value).toBe("Before");
    expect(textAfter?.value).toBe("after");
  });
});
