// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Message } from "@/components/agent-chat/message";
import type { HermesMessage } from "@/components/agent-chat/types";

afterEach(cleanup);

function makeAssistantMessage(overrides: Partial<HermesMessage> = {}): HermesMessage {
  return {
    id: "msg-1",
    role: "assistant",
    content: "Agent response text",
    ...overrides,
  };
}

describe("Message — credit badge", () => {
  it("does not show credit badge when creditsUsed is absent", () => {
    const msg = makeAssistantMessage();
    render(<Message message={msg} />);
    expect(screen.queryByLabelText(/credits/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("credit-badge")).not.toBeInTheDocument();
  });

  it("shows credit badge for assistant messages with creditsUsed", () => {
    const msg = makeAssistantMessage({ creditsUsed: 4 });
    render(<Message message={msg} />);
    const badge = screen.getByLabelText("4 credits");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("4 credits");
  });

  it("uses singular 'credit' when creditsUsed is 1", () => {
    const msg = makeAssistantMessage({ creditsUsed: 1 });
    render(<Message message={msg} />);
    expect(screen.getByLabelText("1 credit")).toBeInTheDocument();
    expect(screen.getByText(/1 credit/)).toBeInTheDocument();
  });

  it("does not show credit badge for user messages even with creditsUsed", () => {
    const msg: HermesMessage = {
      id: "msg-2",
      role: "user",
      content: "User message",
      creditsUsed: 5,
    };
    render(<Message message={msg} />);
    expect(screen.queryByLabelText(/credits/)).not.toBeInTheDocument();
  });

  it("does not display USD anywhere in the credit badge", () => {
    const msg = makeAssistantMessage({ creditsUsed: 25 });
    const { container } = render(<Message message={msg} />);
    expect(container.textContent).not.toMatch(/\$/);
    expect(container.textContent).not.toMatch(/USD/);
    expect(container.textContent).not.toMatch(/usd/);
  });

  it("shows both stopped indicator and credit badge for stopped messages", () => {
    const msg = makeAssistantMessage({ creditsUsed: 1, finishReason: "stopped" });
    render(<Message message={msg} />);
    expect(screen.getByText(/— stopped/)).toBeInTheDocument();
    expect(screen.getByLabelText("1 credit")).toBeInTheDocument();
  });

  it("shows credit badge without stopped indicator for completed messages", () => {
    const msg = makeAssistantMessage({ creditsUsed: 8 });
    render(<Message message={msg} />);
    expect(screen.queryByText(/— stopped/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("8 credits")).toBeInTheDocument();
  });

  it("renders credit badge with the data-credit-badge attribute", () => {
    const msg = makeAssistantMessage({ creditsUsed: 4 });
    const { container } = render(<Message message={msg} />);
    const badge = container.querySelector("[data-credit-badge]");
    expect(badge).toBeInTheDocument();
  });
});
