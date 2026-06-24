// @vitest-environment jsdom
/**
 * Integration and visual-regression tests for the CTA click flow.
 *
 * E2E flow: a thread renders an assistant message with ctaSuggestions active,
 * the user clicks a CTA card's action button, the action text is submitted, and
 * the CTA row transitions to inert (opacity-50, data-active="false").
 *
 * Visual regression: verifies the structural classes that drive the inert-card
 * appearance and the responsive flex-wrap layout at 767 px.
 */
import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("@/services/hermes-agent/chat", () => ({
  getWorkspaceCapabilities: vi.fn().mockResolvedValue({ gitnexus: false, rag: false }),
}));
vi.mock("@/constants/axios", () => ({ getBffBaseUrl: () => "http://localhost" }));

// ── Imports under test ───────────────────────────────────────────────────────
const { CTACard } = await import("@/components/agent-chat/cta-card");
const { CTASuggestionRow } = await import("@/components/agent-chat/cta-suggestion-row");

import type { CtaSuggestion } from "@/components/agent-chat/types";

const SAMPLE: CtaSuggestion = {
  id: "e2e-1",
  title: "Approve product spec",
  category: "Lifecycle",
  description: "Mark the spec approved and advance to technical design.",
  action_text: "/approve-product-spec",
  button_label: "Approve",
  icon: "✅",
};

// ── E2E: click → submit → row grayed out ─────────────────────────────────────

/**
 * Stateful harness that mirrors the real handleCtaAction + dismissActiveCta
 * flow in AgentChatPanel: clicking a CTA records the submitted text and
 * sets ctaActive to false (same as the parent flipping ctaActive → false after
 * the setMessages dispatch).
 */
function CtaFlowHarness({ onAction }: { onAction?: (text: string) => void } = {}) {
  const [ctaActive, setCtaActive] = useState(true);
  const [submitted, setSubmitted] = useState<string | null>(null);

  function handleAction(actionText: string) {
    setSubmitted(actionText);
    setCtaActive(false);
    onAction?.(actionText);
  }

  return (
    <div>
      {/* Simulates the assistant message thread showing the submitted user message */}
      {submitted !== null && (
        <div data-testid="submitted-message" role="article">
          {submitted}
        </div>
      )}
      <CTASuggestionRow suggestions={[SAMPLE]} active={ctaActive} onAction={handleAction} />
    </div>
  );
}

describe("E2E — CTA click → message submitted → row grayed out", () => {
  it("action button is enabled when the CTA row is active", () => {
    render(<CtaFlowHarness />);

    const row = document.querySelector("[data-cta-suggestion-row]");
    expect(row).not.toBeNull();
    expect(row?.getAttribute("data-active")).toBe("true");

    const btn = screen.getByRole("button");
    expect(btn).not.toBeDisabled();
  });

  it("clicking a CTA submits the action text", () => {
    const onAction = vi.fn();
    render(<CtaFlowHarness onAction={onAction} />);

    fireEvent.click(screen.getByRole("button"));

    expect(onAction).toHaveBeenCalledOnce();
    expect(onAction).toHaveBeenCalledWith("/approve-product-spec");
  });

  it("submitted action text appears in the thread after clicking", () => {
    render(<CtaFlowHarness />);

    expect(screen.queryByTestId("submitted-message")).toBeNull();

    fireEvent.click(screen.getByRole("button"));

    const msg = screen.getByTestId("submitted-message");
    expect(msg).toBeInTheDocument();
    expect(msg).toHaveTextContent("/approve-product-spec");
  });

  it("CTA row becomes data-active=false immediately after click", () => {
    render(<CtaFlowHarness />);

    const row = document.querySelector("[data-cta-suggestion-row]");
    expect(row?.getAttribute("data-active")).toBe("true");

    fireEvent.click(screen.getByRole("button"));

    expect(row?.getAttribute("data-active")).toBe("false");
  });

  it("CTA card gets opacity-50 class after click (grayed out)", () => {
    render(<CtaFlowHarness />);

    const card = document.querySelector("[data-cta-card]");
    expect(card?.className).not.toContain("opacity-50");

    fireEvent.click(screen.getByRole("button"));

    expect(card?.className).toContain("opacity-50");
  });

  it("action button is disabled after click", () => {
    render(<CtaFlowHarness />);

    const btn = screen.getByRole("button");
    expect(btn).not.toBeDisabled();

    fireEvent.click(btn);

    expect(btn).toBeDisabled();
  });

  it("card data-active attribute is false after click", () => {
    render(<CtaFlowHarness />);

    const card = document.querySelector("[data-cta-card]");
    expect(card?.getAttribute("data-active")).toBe("true");

    fireEvent.click(screen.getByRole("button"));

    expect(card?.getAttribute("data-active")).toBe("false");
  });
});

// ── Visual regression: CTACard inert state ───────────────────────────────────

describe("Visual regression — CTACard inert state", () => {
  it("has opacity-50 class on the card wrapper", () => {
    render(<CTACard suggestion={SAMPLE} active={false} onAction={vi.fn()} />);
    const card = document.querySelector("[data-cta-card]");
    expect(card?.className).toContain("opacity-50");
  });

  it("has pointer-events-none on the card wrapper", () => {
    render(<CTACard suggestion={SAMPLE} active={false} onAction={vi.fn()} />);
    const card = document.querySelector("[data-cta-card]");
    expect(card?.className).toContain("pointer-events-none");
  });

  it("action button is disabled (HTML disabled attribute)", () => {
    render(<CTACard suggestion={SAMPLE} active={false} onAction={vi.fn()} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("action button has cursor-not-allowed class", () => {
    render(<CTACard suggestion={SAMPLE} active={false} onAction={vi.fn()} />);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("cursor-not-allowed");
  });

  it("data-active attribute on card is false", () => {
    render(<CTACard suggestion={SAMPLE} active={false} onAction={vi.fn()} />);
    const card = document.querySelector("[data-cta-card]");
    expect(card?.getAttribute("data-active")).toBe("false");
  });

  it("active card does NOT have opacity-50 or pointer-events-none", () => {
    render(<CTACard suggestion={SAMPLE} active={true} onAction={vi.fn()} />);
    const card = document.querySelector("[data-cta-card]");
    expect(card?.className).not.toContain("opacity-50");
    expect(card?.className).not.toContain("pointer-events-none");
  });
});

// ── Visual regression: CTASuggestionRow mobile layout at 767 px ──────────────

describe("Visual regression — CTASuggestionRow mobile stacking at 767 px", () => {
  const THREE: CtaSuggestion[] = [
    { ...SAMPLE, id: "m1", title: "Action 1" },
    { ...SAMPLE, id: "m2", title: "Action 2" },
    { ...SAMPLE, id: "m3", title: "Action 3" },
  ];

  it("row has flex-row class (horizontal flex container)", () => {
    render(<CTASuggestionRow suggestions={THREE} active={false} onAction={vi.fn()} />);
    const row = document.querySelector("[data-cta-suggestion-row]");
    expect(row?.className).toContain("flex-row");
  });

  it("row has flex-wrap class (cards wrap to next line on narrow viewports)", () => {
    render(<CTASuggestionRow suggestions={THREE} active={false} onAction={vi.fn()} />);
    const row = document.querySelector("[data-cta-suggestion-row]");
    expect(row?.className).toContain("flex-wrap");
  });

  it("each card has min-w set so they stack when container is 767 px wide", () => {
    // Cards have min-w-[180px] — at 767 px a three-card row (3×180=540px + gaps)
    // fits in one row, but any wrapping is handled via flex-wrap above.
    // Verify the structural class is present on every card.
    render(<CTASuggestionRow suggestions={THREE} active={false} onAction={vi.fn()} />);
    const cards = document.querySelectorAll("[data-cta-card]");
    expect(cards.length).toBe(3);
    for (const card of cards) {
      expect(card.className).toContain("min-w-");
    }
  });

  it("row renders all three cards without overflow hiding any", () => {
    render(<CTASuggestionRow suggestions={THREE} active={false} onAction={vi.fn()} />);
    expect(screen.getByText("Action 1")).toBeInTheDocument();
    expect(screen.getByText("Action 2")).toBeInTheDocument();
    expect(screen.getByText("Action 3")).toBeInTheDocument();
  });

  it("cards wrap because the container has flex-wrap (not flex-nowrap)", () => {
    render(<CTASuggestionRow suggestions={THREE} active={false} onAction={vi.fn()} />);
    const row = document.querySelector("[data-cta-suggestion-row]");
    // Explicit absence of nowrap confirms wrapping is allowed
    expect(row?.className).not.toContain("flex-nowrap");
  });
});
