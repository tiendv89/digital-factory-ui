/**
 * T1 — Theme tokens + dark VS Code theme
 *
 * Verifies:
 * 1. Every token name referenced in tailwind.config.ts resolves to a
 *    CSS variable (not a bare hex value or literal).
 * 2. The dark palette uses oklch throughout (no hex in @theme inline block).
 * 3. The HTML root element carries the `dark` class for HeroUI activation.
 * 4. All required token names are present.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const REPO_ROOT = path.resolve(__dirname, "../../");

function readFile(rel: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
}

describe("Theme tokens — globals.css", () => {
  const css = readFile("src/app/globals.css");

  it("uses @theme inline block", () => {
    expect(css).toContain("@theme inline");
  });

  it("defines dark background token via oklch", () => {
    expect(css).toMatch(/--color-bg:\s*oklch/);
  });

  it("defines dark surface token via oklch", () => {
    expect(css).toMatch(/--color-surface:\s*oklch/);
  });

  it("defines dark text-primary token via oklch", () => {
    expect(css).toMatch(/--color-text-primary:\s*oklch/);
  });

  it("defines dark text-secondary token via oklch", () => {
    expect(css).toMatch(/--color-text-secondary:\s*oklch/);
  });

  it("defines dark border token via oklch", () => {
    expect(css).toMatch(/--color-border:\s*oklch/);
  });

  it("defines primary color token via oklch", () => {
    expect(css).toMatch(/--color-primary:\s*oklch/);
  });

  it("defines success status token via oklch", () => {
    expect(css).toMatch(/--color-success:\s*oklch/);
  });

  it("defines warning status token via oklch", () => {
    expect(css).toMatch(/--color-warning:\s*oklch/);
  });

  it("defines danger status token via oklch", () => {
    expect(css).toMatch(/--color-danger:\s*oklch/);
  });

  it("defines IDE shell nav-rail token", () => {
    expect(css).toContain("--color-nav-rail:");
  });

  it("defines IDE shell topbar token", () => {
    expect(css).toContain("--color-topbar:");
  });

  it("defines IDE shell statusbar token", () => {
    expect(css).toContain("--color-statusbar:");
  });

  it("has no bare hex values in @theme inline block", () => {
    const themeBlock = css.match(/@theme inline\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    // Hex values in comments are acceptable; find unquoted # in property values
    const hexInValues = themeBlock
      .split("\n")
      .filter((line) => !line.trim().startsWith("/*") && !line.trim().startsWith("*"))
      .some((line) => {
        const valueMatch = line.match(/:\s*(.*)/);
        if (!valueMatch) return false;
        return /#[0-9a-fA-F]{3,8}/.test(valueMatch[1]);
      });
    expect(hexInValues).toBe(false);
  });
});

describe("Theme tokens — tailwind.config.ts", () => {
  const tw = readFile("tailwind.config.ts");

  const requiredTokens = [
    "primary",
    "primary-light",
    "success",
    "success-bg",
    "warning",
    "warning-bg",
    "danger",
    "danger-bg",
    "ready",
    "purple",
    "purple-bg",
    "yellow",
    "yellow-bg",
    "ready-bg",
    "muted-bg",
    "surface",
    "bg",
    "surface-secondary",
    "border",
    "text-primary",
    "text-secondary",
    "text-muted",
    "chip-bg",
    "surface-subtle",
    "nav-rail",
    "topbar",
    "statusbar",
  ];

  for (const token of requiredTokens) {
    it(`maps token '${token}' to a CSS variable`, () => {
      // Keys may appear quoted ("token") or bare (token:) in the config
      const hasKey =
        tw.includes(`"${token}"`) || new RegExp(`\\b${token}:`).test(tw);
      expect(hasKey).toBe(true);
      expect(tw).toContain(`var(--color-${token})`);
    });
  }

  it("all color entries reference var(--color-*)", () => {
    // Extract the colors block
    const colorsBlock = tw.match(/colors:\s*\{([\s\S]*?)\},/)?.[1] ?? "";
    const lines = colorsBlock
      .split("\n")
      .filter((l) => l.includes(":") && !l.trim().startsWith("//") && !l.trim().startsWith("/*"));
    for (const line of lines) {
      const valueMatch = line.match(/:\s*"(.*?)"/);
      if (valueMatch) {
        expect(valueMatch[1]).toMatch(/^var\(--/);
      }
    }
  });
});

describe("Dark theme — layout.tsx", () => {
  const layout = readFile("src/app/layout.tsx");

  it('adds "dark" class to <html> element for HeroUI activation', () => {
    expect(layout).toContain("dark");
    expect(layout).toMatch(/<html[^>]*dark[^>]*>/);
  });
});
