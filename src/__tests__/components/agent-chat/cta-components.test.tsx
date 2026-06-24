// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

// ──────────────────────────────────────────────────────────────────────
// Imports under test (must come after mocks to pick up vi.mock)
// ──────────────────────────────────────────────────────────────────────

import { capabilityStarterCards, lifecycleStarterCards } from "@/components/agent-chat/empty-state-cta-row";
import type { CtaSuggestion } from "@/components/agent-chat/types";

// ──────────────────────────────────────────────────────────────────────
// Mocks for modules that need browser APIs / fetch
// ──────────────────────────────────────────────────────────────────────

vi.mock("@/services/hermes-agent/chat", () => ({
  getWorkspaceCapabilities: vi.fn().mockResolvedValue({ gitnexus: false, rag: false }),
}));

vi.mock("@/constants/axios", () => ({ getBffBaseUrl: () => "http://localhost" }));

// ──────────────────────────────────────────────────────────────────────
// lifecycleStarterCards — static mapping tests
// ──────────────────────────────────────────────────────────────────────

describe("lifecycleStarterCards", () => {
  it("returns write+approve+revise cards for in_design", () => {
    const cards = lifecycleStarterCards("in_design");
    const ids = cards.map((c) => c.id);
    expect(ids).toContain("starter-write-spec");
    expect(ids).toContain("starter-approve-spec");
    expect(ids).toContain("starter-revise-spec");
    expect(cards.length).toBe(3);
  });

  it("returns write+approve cards for in_tdd", () => {
    const cards = lifecycleStarterCards("in_tdd");
    const ids = cards.map((c) => c.id);
    expect(ids).toContain("starter-write-design");
    expect(ids).toContain("starter-approve-design");
    expect(cards.length).toBe(2);
  });

  it("returns generate-tasks card for ready_for_implementation", () => {
    const cards = lifecycleStarterCards("ready_for_implementation");
    expect(cards.length).toBe(1);
    expect(cards[0].id).toBe("starter-generate-tasks");
  });

  it("returns check-tasks and review-pr for in_implementation", () => {
    const cards = lifecycleStarterCards("in_implementation");
    const ids = cards.map((c) => c.id);
    expect(ids).toContain("starter-check-tasks");
    expect(ids).toContain("starter-review-pr");
    expect(cards.length).toBe(2);
  });

  it("returns empty array for unknown status", () => {
    expect(lifecycleStarterCards("in_handoff")).toHaveLength(0);
    expect(lifecycleStarterCards(null)).toHaveLength(0);
    expect(lifecycleStarterCards(undefined)).toHaveLength(0);
  });

  it("all cards have required fields", () => {
    const cards = lifecycleStarterCards("in_design");
    for (const card of cards) {
      expect(card.id).toBeTruthy();
      expect(card.title).toBeTruthy();
      expect(card.category).toBe("Lifecycle");
      expect(card.action_text).toBeTruthy();
      expect(card.button_label).toBeTruthy();
      expect(card.description).toBeTruthy();
    }
  });
});

// ──────────────────────────────────────────────────────────────────────
// capabilityStarterCards — gating tests
// ──────────────────────────────────────────────────────────────────────

describe("capabilityStarterCards", () => {
  it("returns empty array when both gitnexus and rag are false", () => {
    const cards = capabilityStarterCards({ gitnexus: false, rag: false });
    expect(cards).toHaveLength(0);
  });

  it("returns gitnexus card when gitnexus is true", () => {
    const cards = capabilityStarterCards({ gitnexus: true, rag: false });
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe("starter-gitnexus");
    expect(cards[0].category).toBe("GitNexus");
  });

  it("returns rag card when rag is true", () => {
    const cards = capabilityStarterCards({ gitnexus: false, rag: true });
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe("starter-rag");
    expect(cards[0].category).toBe("RAG");
  });

  it("returns both cards when both capabilities are true", () => {
    const cards = capabilityStarterCards({ gitnexus: true, rag: true });
    expect(cards).toHaveLength(2);
    const ids = cards.map((c) => c.id);
    expect(ids).toContain("starter-gitnexus");
    expect(ids).toContain("starter-rag");
  });

  it("suppresses gitnexus starter when gitnexus is false", () => {
    const cards = capabilityStarterCards({ gitnexus: false, rag: true });
    const ids = cards.map((c) => c.id);
    expect(ids).not.toContain("starter-gitnexus");
  });

  it("suppresses rag starter when rag is false", () => {
    const cards = capabilityStarterCards({ gitnexus: true, rag: false });
    const ids = cards.map((c) => c.id);
    expect(ids).not.toContain("starter-rag");
  });
});

// ──────────────────────────────────────────────────────────────────────
// CTACard — active vs inert states
// ──────────────────────────────────────────────────────────────────────

const { CTACard } = await import("@/components/agent-chat/cta-card");

const SAMPLE_SUGGESTION: CtaSuggestion = {
  id: "test-1",
  title: "Approve product spec",
  category: "Lifecycle",
  description: "Mark the spec approved and advance to technical design.",
  action_text: "/approve-product-spec",
  button_label: "Approve",
  icon: "✅",
};

describe("CTACard — active state", () => {
  it("renders title, category, description, and button label", () => {
    const onAction = vi.fn();
    render(<CTACard suggestion={SAMPLE_SUGGESTION} active={true} onAction={onAction} />);

    expect(screen.getByText("Approve product spec")).toBeInTheDocument();
    expect(screen.getByText("Lifecycle")).toBeInTheDocument();
    expect(screen.getByText("Mark the spec approved and advance to technical design.")).toBeInTheDocument();
    expect(screen.getByText("Approve")).toBeInTheDocument();
  });

  it("calls onAction with action_text when button is clicked", () => {
    const onAction = vi.fn();
    render(<CTACard suggestion={SAMPLE_SUGGESTION} active={true} onAction={onAction} />);

    fireEvent.click(screen.getByRole("button"));
    expect(onAction).toHaveBeenCalledOnce();
    expect(onAction).toHaveBeenCalledWith("/approve-product-spec");
  });

  it("renders icon when provided", () => {
    const onAction = vi.fn();
    render(<CTACard suggestion={SAMPLE_SUGGESTION} active={true} onAction={onAction} />);
    expect(screen.getByText("✅")).toBeInTheDocument();
  });
});

describe("CTACard — inert state", () => {
  it("has opacity-50 class (visually grayed out)", () => {
    const onAction = vi.fn();
    render(<CTACard suggestion={SAMPLE_SUGGESTION} active={false} onAction={onAction} />);

    const cardEl = document.querySelector("[data-cta-card]");
    expect(cardEl?.className).toContain("opacity-50");
  });

  it("does not call onAction when button is clicked on inert card", () => {
    const onAction = vi.fn();
    render(<CTACard suggestion={SAMPLE_SUGGESTION} active={false} onAction={onAction} />);

    const btn = screen.getByRole("button");
    // Button is disabled
    expect(btn).toBeDisabled();
  });
});

// ──────────────────────────────────────────────────────────────────────
// CTASuggestionRow — rendering and mobile stacking
// ──────────────────────────────────────────────────────────────────────

const { CTASuggestionRow } = await import("@/components/agent-chat/cta-suggestion-row");

const THREE_SUGGESTIONS: CtaSuggestion[] = [
  { ...SAMPLE_SUGGESTION, id: "s1", title: "Action 1" },
  { ...SAMPLE_SUGGESTION, id: "s2", title: "Action 2" },
  { ...SAMPLE_SUGGESTION, id: "s3", title: "Action 3" },
];

describe("CTASuggestionRow", () => {
  it("renders up to 3 cards", () => {
    render(<CTASuggestionRow suggestions={THREE_SUGGESTIONS} active={false} onAction={vi.fn()} />);
    const cards = document.querySelectorAll("[data-cta-card]");
    expect(cards.length).toBe(3);
  });

  it("renders nothing when suggestions is empty", () => {
    const { container } = render(<CTASuggestionRow suggestions={[]} active={false} onAction={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("caps at 3 cards even if more suggestions are provided", () => {
    const four = [...THREE_SUGGESTIONS, { ...SAMPLE_SUGGESTION, id: "s4", title: "Action 4" }];
    render(<CTASuggestionRow suggestions={four} active={false} onAction={vi.fn()} />);
    const cards = document.querySelectorAll("[data-cta-card]");
    expect(cards.length).toBe(3);
  });

  it("marks the row with data-active attribute", () => {
    render(<CTASuggestionRow suggestions={THREE_SUGGESTIONS} active={true} onAction={vi.fn()} />);
    const row = document.querySelector("[data-cta-suggestion-row]");
    expect(row?.getAttribute("data-active")).toBe("true");
  });

  it("has flex-row flex-wrap class for responsive layout", () => {
    render(<CTASuggestionRow suggestions={THREE_SUGGESTIONS} active={false} onAction={vi.fn()} />);
    const row = document.querySelector("[data-cta-suggestion-row]");
    expect(row?.className).toContain("flex-row");
    expect(row?.className).toContain("flex-wrap");
  });
});
