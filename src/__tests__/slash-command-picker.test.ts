/**
 * T4 — SlashCommandPicker
 *
 * Covers:
 *   - filterCommands: returns all commands for '/', filters by prefix/substring
 *   - filterCommands: empty string returns no commands
 *   - filterCommands: partial match (e.g. '/wri') returns only matching commands
 *   - filterCommands: case-insensitive matching
 *   - COMMANDS: all four expected commands are registered
 *   - SlashCommandPicker: renders when there are filtered results
 *   - SlashCommandPicker: returns null when no commands match
 *   - SlashCommandPicker: data-slash-command-picker present
 *   - SlashCommandPicker: data-slash-command-item rendered per filtered command
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { COMMANDS, filterCommands, SlashCommandPicker } from "../features/agent-chat/slash-command-picker";

// ─── COMMANDS registry ───────────────────────────────────────────────────────

describe("COMMANDS registry", () => {
  it("contains all four workflow commands", () => {
    const names = COMMANDS.map((c) => c.name);
    expect(names).toContain("/write-product-spec");
    expect(names).toContain("/write-technical-design");
    expect(names).toContain("/get-feature-state");
    expect(names).toContain("/get-workspace-context");
  });

  it("each command has a non-empty hint", () => {
    for (const cmd of COMMANDS) {
      expect(cmd.hint.length).toBeGreaterThan(0);
    }
  });
});

// ─── filterCommands ──────────────────────────────────────────────────────────

describe("filterCommands", () => {
  it("returns all commands when query is '/'", () => {
    const result = filterCommands("/");
    expect(result).toHaveLength(COMMANDS.length);
  });

  it("returns empty array when query is empty string", () => {
    const result = filterCommands("");
    expect(result).toHaveLength(0);
  });

  it("filters to only write commands for '/wri'", () => {
    const result = filterCommands("/wri");
    const names = result.map((c) => c.name);
    expect(names).toContain("/write-product-spec");
    expect(names).toContain("/write-technical-design");
    expect(names).not.toContain("/get-feature-state");
    expect(names).not.toContain("/get-workspace-context");
  });

  it("filters to only get commands for '/get'", () => {
    const result = filterCommands("/get");
    const names = result.map((c) => c.name);
    expect(names).toContain("/get-feature-state");
    expect(names).toContain("/get-workspace-context");
    expect(names).not.toContain("/write-product-spec");
  });

  it("returns single command for '/write-product'", () => {
    const result = filterCommands("/write-product");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("/write-product-spec");
  });

  it("is case-insensitive", () => {
    const result = filterCommands("/WRI");
    expect(result).toHaveLength(2);
  });

  it("returns empty array for unmatched query", () => {
    const result = filterCommands("/zzz-no-match");
    expect(result).toHaveLength(0);
  });
});

// ─── SlashCommandPicker rendering ────────────────────────────────────────────

describe("SlashCommandPicker", () => {
  it("renders the picker when query matches commands", () => {
    const html = renderToStaticMarkup(
      React.createElement(SlashCommandPicker, {
        query: "/",
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    expect(html).toContain("data-slash-command-picker");
    expect(html).toContain("data-slash-command-item");
  });

  it("returns null when no commands match query", () => {
    const html = renderToStaticMarkup(
      React.createElement(SlashCommandPicker, {
        query: "/zzz-no-match",
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    expect(html).toBe("");
  });

  it("renders only matching commands for '/wri'", () => {
    const html = renderToStaticMarkup(
      React.createElement(SlashCommandPicker, {
        query: "/wri",
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    expect(html).toContain("/write-product-spec");
    expect(html).toContain("/write-technical-design");
    expect(html).not.toContain("/get-feature-state");
    expect(html).not.toContain("/get-workspace-context");
  });

  it("renders all four commands for '/'", () => {
    const html = renderToStaticMarkup(
      React.createElement(SlashCommandPicker, {
        query: "/",
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    expect(html).toContain("/write-product-spec");
    expect(html).toContain("/write-technical-design");
    expect(html).toContain("/get-feature-state");
    expect(html).toContain("/get-workspace-context");
  });

  it("shows hints alongside command names", () => {
    const html = renderToStaticMarkup(
      React.createElement(SlashCommandPicker, {
        query: "/get-feature",
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    expect(html).toContain("Show current feature lifecycle state");
  });

  it("marks first item active by default", () => {
    const html = renderToStaticMarkup(
      React.createElement(SlashCommandPicker, {
        query: "/",
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    // data-active="true" on the first item
    expect(html).toContain('data-active="true"');
  });
});
