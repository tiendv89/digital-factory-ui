// @vitest-environment jsdom
/**
 * Regression: the slash-command and @mention pickers register a capture-phase
 * document keydown listener. They must NOT hijack Shift+Enter — that keystroke
 * has to fall through to the textarea so it inserts a newline. Only plain Enter
 * selects the highlighted item.
 */
import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// jsdom doesn't implement scrollIntoView, which the pickers call in an effect.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(cleanup);

vi.mock("@/services/hermes-agent/tools", () => ({
  listTools: () => Promise.resolve([{ name: "write_product_spec", description: "Write a product spec" }]),
}));

const { MentionPicker } = await import("@/components/agent-chat/mention-picker");
const { SlashCommandPicker } = await import("@/components/agent-chat/slash-command-picker");

import type { ThreadMember } from "@/components/agent-chat/types";

const MEMBERS: ThreadMember[] = [{ id: "agent", name: "Hermes Agent", handle: "agent", kind: "agent" }];

describe("MentionPicker — Shift+Enter falls through", () => {
  it("does not select on Shift+Enter", () => {
    const onSelect = vi.fn();
    render(<MentionPicker query="" members={MEMBERS} onSelect={onSelect} onClose={vi.fn()} />);

    fireEvent.keyDown(document, { key: "Enter", shiftKey: true });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("selects on plain Enter", () => {
    const onSelect = vi.fn();
    render(<MentionPicker query="" members={MEMBERS} onSelect={onSelect} onClose={vi.fn()} />);

    fireEvent.keyDown(document, { key: "Enter", shiftKey: false });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe("SlashCommandPicker — Shift+Enter falls through", () => {
  it("does not select on Shift+Enter", async () => {
    const onSelect = vi.fn();
    render(<SlashCommandPicker query="write" onSelect={onSelect} onClose={vi.fn()} />);
    // Wait for async listTools() to populate + render the filtered command.
    await screen.findByText("/write-product-spec");

    fireEvent.keyDown(document, { key: "Enter", shiftKey: true });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("selects on plain Enter", async () => {
    const onSelect = vi.fn();
    render(<SlashCommandPicker query="write" onSelect={onSelect} onClose={vi.fn()} />);
    await screen.findByText("/write-product-spec");

    fireEvent.keyDown(document, { key: "Enter", shiftKey: false });
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith("/write-product-spec"));
  });
});
