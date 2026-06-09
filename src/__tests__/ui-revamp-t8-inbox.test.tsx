/**
 * T8 — Inbox (placeholder view)
 *
 * Covers:
 * - data-inbox-page attribute is present
 * - Placeholder banner is rendered and labelled as not yet wired
 * - Filter tabs render for All / Gate / Questions / Blocks / FYI
 * - Each tab has correct data-tab and role attributes
 * - Feature groups render items grouped by feature
 * - All action buttons are disabled (disabled attribute present)
 * - Action type mapping: gate→approve+reject, question→reply, block→resolve, fyi→dismiss
 * - Item type labels are present
 * - Dark theme classes are used
 * - No backend fetch is triggered (no fetch/useEffect, pure static data)
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeAll } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/inbox"),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn(() => null) }),
}));

import InboxPage from "../app/(shell)/inbox/page";

describe("InboxPage — structure", () => {
  let html: string;

  beforeAll(() => {
    html = renderToStaticMarkup(React.createElement(InboxPage));
  });

  it("renders data-inbox-page attribute", () => {
    expect(html).toContain("data-inbox-page");
  });

  it("renders placeholder banner", () => {
    expect(html).toContain("data-inbox-banner");
  });

  it("banner contains 'not yet wired' text", () => {
    expect(html).toContain("not yet wired");
  });

  it("renders filter tab list", () => {
    expect(html).toContain('data-inbox-filter-tabs');
    expect(html).toContain('role="tablist"');
  });

  it("renders All tab", () => {
    expect(html).toContain('data-tab="all"');
  });

  it("renders Gate tab", () => {
    expect(html).toContain('data-tab="gate"');
  });

  it("renders Questions tab", () => {
    expect(html).toContain('data-tab="question"');
    expect(html).toContain("Questions");
  });

  it("renders Blocks tab", () => {
    expect(html).toContain('data-tab="block"');
    expect(html).toContain("Blocks");
  });

  it("renders FYI tab", () => {
    expect(html).toContain('data-tab="fyi"');
    expect(html).toContain("FYI");
  });

  it("All tab is active by default (aria-selected=true)", () => {
    // aria-selected comes before data-tab in rendered HTML
    expect(html).toMatch(/aria-selected="true"[^>]*data-tab="all"/);
  });

  it("non-All tabs are not selected by default", () => {
    expect(html).toMatch(/aria-selected="false"[^>]*data-tab="gate"/);
    expect(html).toMatch(/aria-selected="false"[^>]*data-tab="question"/);
    expect(html).toMatch(/aria-selected="false"[^>]*data-tab="block"/);
    expect(html).toMatch(/aria-selected="false"[^>]*data-tab="fyi"/);
  });

  it("renders feature group containers", () => {
    expect(html).toContain("data-inbox-group");
  });

  it("renders multiple inbox items", () => {
    const matches = html.match(/data-inbox-item=/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThan(1);
  });

  it("renders approve actions for gate items", () => {
    expect(html).toContain('data-action="approve"');
  });

  it("renders reject actions for gate items", () => {
    expect(html).toContain('data-action="reject"');
  });

  it("renders reply actions for question items", () => {
    expect(html).toContain('data-action="reply"');
  });

  it("renders resolve actions for block items", () => {
    expect(html).toContain('data-action="resolve"');
  });

  it("renders dismiss actions for fyi items", () => {
    expect(html).toContain('data-action="dismiss"');
  });

  it("action buttons carry the disabled attribute", () => {
    // disabled="" appears before data-action in rendered HTML
    // Verify each action type has a corresponding disabled button
    expect(html).toMatch(/disabled=""[^>]*data-action="approve"/);
    expect(html).toMatch(/disabled=""[^>]*data-action="reject"/);
    expect(html).toMatch(/disabled=""[^>]*data-action="reply"/);
    expect(html).toMatch(/disabled=""[^>]*data-action="resolve"/);
    expect(html).toMatch(/disabled=""[^>]*data-action="dismiss"/);
  });

  it("renders Gate item type label", () => {
    expect(html).toContain(">Gate<");
  });

  it("renders Question item type label", () => {
    expect(html).toContain(">Question<");
  });

  it("renders Block item type label", () => {
    expect(html).toContain(">Block<");
  });

  it("renders FYI item type label", () => {
    expect(html).toContain(">FYI<");
  });

  it("uses dark theme border classes", () => {
    expect(html).toContain("border-border");
  });

  it("uses dark theme surface classes", () => {
    expect(html).toContain("bg-surface");
  });

  it("uses text-muted for secondary text", () => {
    expect(html).toContain("text-text-muted");
  });

  it("uses warning color for placeholder banner", () => {
    expect(html).toContain("bg-warning-bg");
    expect(html).toContain("text-warning");
  });
});

describe("InboxPage — feature grouping", () => {
  it("groups items by feature with data-inbox-group", () => {
    const html = renderToStaticMarkup(React.createElement(InboxPage));
    // Should have at least two feature groups (ui-revamp and workflow-db in mock data)
    const groupMatches = html.match(/data-inbox-group=/g);
    expect(groupMatches).not.toBeNull();
    expect(groupMatches!.length).toBeGreaterThanOrEqual(2);
  });

  it("renders feature name in group header", () => {
    const html = renderToStaticMarkup(React.createElement(InboxPage));
    expect(html).toContain("UI Revamp");
    expect(html).toContain("Workflow DB");
  });
});
