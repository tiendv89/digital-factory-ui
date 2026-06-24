// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SessionCostHeader } from "@/components/agent-chat/session-cost-header";
import type { SessionQuota } from "@/services/workflow-bff/cost";

afterEach(cleanup);

function makeQuota(overrides: Partial<SessionQuota> = {}): SessionQuota {
  return {
    daily_used: 1000,
    daily_cap: 10000,
    weekly_used: 5000,
    weekly_cap: 50000,
    plan_name: "Pro",
    daily_reset_at: "2026-06-25T00:00:00Z",
    weekly_reset_at: "2026-06-30T00:00:00Z",
    ...overrides,
  };
}

describe("SessionCostHeader", () => {
  it("renders session credit total", () => {
    render(<SessionCostHeader sessionCredits={25} quota={makeQuota()} />);
    expect(screen.getByText(/Session:/)).toBeInTheDocument();
    expect(screen.getByText(/25/)).toBeInTheDocument();
  });

  it("renders daily remaining and cap", () => {
    render(<SessionCostHeader sessionCredits={10} quota={makeQuota({ daily_used: 1000, daily_cap: 10000 })} />);
    // remaining = 10000 - 1000 = 9000
    const text = screen.getByText(/Daily:/);
    expect(text).toBeInTheDocument();
    expect(text.textContent).toContain("9,000");
    expect(text.textContent).toContain("10,000");
  });

  it("renders the plan name badge", () => {
    render(<SessionCostHeader sessionCredits={0} quota={makeQuota({ plan_name: "Team" })} />);
    expect(screen.getByText("Team")).toBeInTheDocument();
  });

  it("does not show USD anywhere", () => {
    const { container } = render(<SessionCostHeader sessionCredits={100} quota={makeQuota()} />);
    expect(container.textContent).not.toMatch(/\$/);
    expect(container.textContent).not.toMatch(/USD/);
    expect(container.textContent).not.toMatch(/usd/);
  });

  it("clamps daily remaining to 0 when over-used", () => {
    render(
      <SessionCostHeader
        sessionCredits={0}
        quota={makeQuota({ daily_used: 12000, daily_cap: 10000 })}
      />,
    );
    const text = screen.getByText(/Daily:/);
    expect(text.textContent).toContain("0");
    expect(text.textContent).toContain("10,000");
  });

  it("renders with zero session credits", () => {
    render(<SessionCostHeader sessionCredits={0} quota={makeQuota()} />);
    expect(screen.getByText(/Session:/)).toBeInTheDocument();
    expect(screen.getByText(/0/)).toBeInTheDocument();
  });

  it("renders the data-session-cost-header attribute", () => {
    const { container } = render(<SessionCostHeader sessionCredits={5} quota={makeQuota()} />);
    expect(container.querySelector("[data-session-cost-header]")).toBeInTheDocument();
  });
});
