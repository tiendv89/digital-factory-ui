// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

// Render HeroUI Modal children directly — avoids portal/animation complexity in jsdom
vi.mock("@heroui/react", async () => {
  const { createElement, Fragment } = await import("react");
  return {
    Modal: {
      Root: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) => (isOpen ? createElement(Fragment, null, children) : null),
      Backdrop: ({ children }: { children: React.ReactNode }) => createElement(Fragment, null, children),
      Container: ({ children }: { children: React.ReactNode }) => createElement(Fragment, null, children),
      Dialog: ({ children }: { children: React.ReactNode }) => createElement(Fragment, null, children),
    },
  };
});

const mockCreateFeature = vi.hoisted(() => vi.fn());
vi.mock("@/services/workflow-backend", () => ({
  createFeature: mockCreateFeature,
}));

import { NewFeatureModal, ORCHESTRATOR_OPTIONS } from "@/components/board/new-feature-modal";

// ──────────────────────────────────────────────────────────────────────
// ORCHESTRATOR_OPTIONS (static shape)
// ──────────────────────────────────────────────────────────────────────

describe("ORCHESTRATOR_OPTIONS", () => {
  it("contains exactly two options", () => {
    expect(ORCHESTRATOR_OPTIONS).toHaveLength(2);
  });

  it("has TypeScript / Git as the first option with value 'ts'", () => {
    const first = ORCHESTRATOR_OPTIONS[0];
    expect(first.value).toBe("ts");
    expect(first.label).toContain("TypeScript");
  });

  it("has Postgres / Go as the second option with value 'go'", () => {
    const second = ORCHESTRATOR_OPTIONS[1];
    expect(second.value).toBe("go");
    expect(second.label).toContain("Go");
  });

  it("each option has a non-empty description", () => {
    for (const opt of ORCHESTRATOR_OPTIONS) {
      expect(opt.description.length).toBeGreaterThan(0);
    }
  });

  it("all option values are either 'ts' or 'go'", () => {
    const validValues = new Set(["ts", "go"]);
    for (const opt of ORCHESTRATOR_OPTIONS) {
      expect(validValues.has(opt.value)).toBe(true);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────
// NewFeatureModal — render + interaction
// ──────────────────────────────────────────────────────────────────────

describe("NewFeatureModal", () => {
  beforeEach(() => {
    mockCreateFeature.mockResolvedValue({
      id: "feat-1",
      feature_id: "my-feature",
      feature_name: "my-feature",
      title: "My Feature",
      status: "active",
      current_stage: "in_design",
      updated_at: "2026-01-01T00:00:00Z",
      task_counts: { total: 0, done: 0 },
      init_pr_merged: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders orchestrator type radio group with TypeScript / Git checked by default", () => {
    render(<NewFeatureModal workspaceId="ws-1" onClose={() => {}} />);

    const tsRadio = screen.getByRole("radio", { name: /TypeScript \/ Git/i });
    const goRadio = screen.getByRole("radio", { name: /Postgres \/ Go/i });

    expect(tsRadio).toBeChecked();
    expect(goRadio).not.toBeChecked();
  });

  it("selecting Postgres / Go radio updates the selection", () => {
    render(<NewFeatureModal workspaceId="ws-1" onClose={() => {}} />);

    const goRadio = screen.getByRole("radio", { name: /Postgres \/ Go/i });
    fireEvent.click(goRadio);

    expect(goRadio).toBeChecked();
    expect(screen.getByRole("radio", { name: /TypeScript \/ Git/i })).not.toBeChecked();
  });

  it("passes owner in the create feature API call", async () => {
    render(<NewFeatureModal workspaceId="ws-1" onClose={() => {}} />);

    fireEvent.change(screen.getByRole("textbox", { name: /Feature name/i }), {
      target: { value: "my-feature" },
    });

    fireEvent.click(screen.getByRole("radio", { name: /Postgres \/ Go/i }));
    fireEvent.click(screen.getByRole("button", { name: /Create Feature/i }));

    await waitFor(() => {
      expect(mockCreateFeature).toHaveBeenCalledWith("ws-1", {
        name: "my-feature",
        owner: "go",
      });
    });
  });

  it("does not include start_stage in the API call", async () => {
    render(<NewFeatureModal workspaceId="ws-1" onClose={() => {}} />);

    fireEvent.change(screen.getByRole("textbox", { name: /Feature name/i }), {
      target: { value: "my-feature" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create Feature/i }));

    await waitFor(() => {
      expect(mockCreateFeature).toHaveBeenCalled();
      const payload = mockCreateFeature.mock.calls[0][1];
      expect(payload).not.toHaveProperty("start_stage");
    });
  });
});
