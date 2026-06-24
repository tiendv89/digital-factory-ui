// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

// Stub HeroUI namespaced components used by PromptInput
vi.mock("@heroui/react", async () => {
  const React = await import("react");
  const fragment = ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children);
  const ListBoxComponent = Object.assign(fragment, {
    Item: fragment,
  });
  const SelectComponent = {
    Root: fragment,
    Trigger: ({ children }: { children: React.ReactNode }) => React.createElement("button", { type: "button" }, children),
    Value: ({ children }: { children: (args: { selectedText: string; isPlaceholder: boolean }) => React.ReactNode }) =>
      React.createElement(React.Fragment, null, children({ selectedText: "", isPlaceholder: true })),
    Popover: fragment,
  };
  return {
    ListBox: ListBoxComponent,
    Select: SelectComponent,
  };
});

// Stub MentionPicker used by PromptInput
vi.mock("@/components/agent-chat/mention-picker", () => ({
  detectMention: () => null,
  insertMention: (_v: string, _a: number, _q: string, handle: string) => handle,
  MentionPicker: () => null,
}));

import { PromptInput } from "@/components/agent-chat/prompt-input";

const defaultProps = {
  value: "",
  onChange: () => {},
  onSubmit: () => {},
  status: "idle" as const,
  models: [],
  selectedModel: "",
  onModelChange: () => {},
};

describe("PromptInput — Stop button", () => {
  it("renders Send button when isAgentWorking is false", () => {
    render(<PromptInput {...defaultProps} isAgentWorking={false} />);
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /stop agent/i })).not.toBeInTheDocument();
  });

  it("renders Stop button when isAgentWorking is true", () => {
    render(<PromptInput {...defaultProps} isAgentWorking={true} />);
    expect(screen.getByRole("button", { name: /stop agent/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send message/i })).not.toBeInTheDocument();
  });

  it("renders Send button by default (isAgentWorking omitted)", () => {
    render(<PromptInput {...defaultProps} />);
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
  });

  it("calls onStop when Stop button is clicked", () => {
    const onStop = vi.fn();
    render(<PromptInput {...defaultProps} isAgentWorking={true} onStop={onStop} />);
    fireEvent.click(screen.getByRole("button", { name: /stop agent/i }));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("does not throw when Stop button clicked without onStop handler", () => {
    render(<PromptInput {...defaultProps} isAgentWorking={true} />);
    expect(() => fireEvent.click(screen.getByRole("button", { name: /stop agent/i }))).not.toThrow();
  });

  it("clicking Stop does not call onSubmit", () => {
    const onSubmit = vi.fn();
    const onStop = vi.fn();
    render(<PromptInput {...defaultProps} isAgentWorking={true} onSubmit={onSubmit} onStop={onStop} />);
    fireEvent.click(screen.getByRole("button", { name: /stop agent/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onStop).toHaveBeenCalledOnce();
  });
});
