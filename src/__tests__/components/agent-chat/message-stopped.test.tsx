// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

import { Message } from "@/components/agent-chat/message";
import type { HermesMessage } from "@/components/agent-chat/types";

function makeAssistantMessage(overrides: Partial<HermesMessage> = {}): HermesMessage {
  return {
    id: "msg-1",
    role: "assistant",
    content: "Partial response text",
    ...overrides,
  };
}

describe("Message — stopped indicator", () => {
  it("does not render stopped indicator for a normal assistant message", () => {
    const msg = makeAssistantMessage();
    render(<Message message={msg} />);
    expect(screen.queryByTestId("stopped-indicator")).not.toBeInTheDocument();
    expect(screen.queryByText(/— stopped/)).not.toBeInTheDocument();
  });

  it("renders stopped indicator when finishReason is 'stopped'", () => {
    const msg = makeAssistantMessage({ finishReason: "stopped" });
    render(<Message message={msg} />);
    expect(screen.getByText(/— stopped/)).toBeInTheDocument();
  });

  it("does not render stopped indicator for finishReason 'stop'", () => {
    const msg = makeAssistantMessage({ finishReason: "stop" });
    render(<Message message={msg} />);
    expect(screen.queryByText(/— stopped/)).not.toBeInTheDocument();
  });

  it("still renders message content when stopped", () => {
    const msg = makeAssistantMessage({ finishReason: "stopped", content: "Partial response text" });
    render(<Message message={msg} />);
    expect(screen.getByText(/Partial response text/)).toBeInTheDocument();
    expect(screen.getByText(/— stopped/)).toBeInTheDocument();
  });

  it("renders the stopped indicator with muted styling", () => {
    const msg = makeAssistantMessage({ finishReason: "stopped" });
    const { container } = render(<Message message={msg} />);
    const indicator = container.querySelector("[data-stopped-indicator]");
    expect(indicator).toBeInTheDocument();
    expect(indicator?.className).toContain("text-text-muted");
  });

  it("does not render stopped indicator for user messages", () => {
    const msg: HermesMessage = { id: "msg-2", role: "user", content: "User message", finishReason: "stopped" };
    render(<Message message={msg} />);
    expect(screen.queryByText(/— stopped/)).not.toBeInTheDocument();
  });
});
