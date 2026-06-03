import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StatusBadge } from "../features/tasks/components/StatusBadge/StatusBadge";

const ACTIVE_STATUSES = ["in_progress", "reviewing"];
const STATIC_STATUSES = ["todo", "ready", "blocked", "in_review", "done", "cancelled"];

describe("StatusBadge — spinner for active statuses", () => {
  for (const status of ACTIVE_STATUSES) {
    it(`renders SVG spinner for status="${status}"`, () => {
      const html = renderToStaticMarkup(
        React.createElement(StatusBadge, { status }),
      );
      expect(html).toContain("<svg");
      expect(html).toContain('class="status-spinner"');
      expect(html).toContain("Processing");
    });
  }

  for (const status of STATIC_STATUSES) {
    it(`does NOT render a spinner for status="${status}"`, () => {
      const html = renderToStaticMarkup(
        React.createElement(StatusBadge, { status }),
      );
      expect(html).not.toContain("<svg");
      expect(html).not.toContain("status-spinner");
    });
  }
});

describe("StatusBadge — status label text", () => {
  it("displays the client-facing label for in_progress", () => {
    const html = renderToStaticMarkup(
      React.createElement(StatusBadge, { status: "in_progress" }),
    );
    expect(html).toContain("In progress");
  });

  it("displays the client-facing label for reviewing", () => {
    const html = renderToStaticMarkup(
      React.createElement(StatusBadge, { status: "reviewing" }),
    );
    expect(html).toContain("In Reviewing");
  });

  it("displays the client-facing label for blocked", () => {
    const html = renderToStaticMarkup(
      React.createElement(StatusBadge, { status: "blocked" }),
    );
    expect(html).toContain("Blocked");
  });

  it("displays the client-facing label for done", () => {
    const html = renderToStaticMarkup(
      React.createElement(StatusBadge, { status: "done" }),
    );
    expect(html).toContain("Done");
  });
});

describe("StatusBadge — accessibility", () => {
  it("spinner SVG has aria-label='Processing'", () => {
    const html = renderToStaticMarkup(
      React.createElement(StatusBadge, { status: "in_progress" }),
    );
    expect(html).toContain('aria-label="Processing"');
  });

  it("spinner SVG has a <title> element for screen readers", () => {
    const html = renderToStaticMarkup(
      React.createElement(StatusBadge, { status: "reviewing" }),
    );
    expect(html).toContain("<title>Processing</title>");
  });

  it("spinner SVG has role='img'", () => {
    const html = renderToStaticMarkup(
      React.createElement(StatusBadge, { status: "in_progress" }),
    );
    expect(html).toContain('role="img"');
  });
});

describe("StatusBadge — styling", () => {
  it("applies the correct background class for in_progress", () => {
    const html = renderToStaticMarkup(
      React.createElement(StatusBadge, { status: "in_progress" }),
    );
    expect(html).toContain("bg-warning-bg");
    expect(html).toContain("text-warning");
  });

  it("applies the correct background class for reviewing", () => {
    const html = renderToStaticMarkup(
      React.createElement(StatusBadge, { status: "reviewing" }),
    );
    expect(html).toContain("bg-info-bg");
    expect(html).toContain("text-info");
  });

  it("applies the correct background class for blocked", () => {
    const html = renderToStaticMarkup(
      React.createElement(StatusBadge, { status: "blocked" }),
    );
    expect(html).toContain("bg-danger-bg");
    expect(html).toContain("text-danger");
  });

  it("applies a custom className when provided", () => {
    const html = renderToStaticMarkup(
      React.createElement(StatusBadge, { status: "blocked", className: "shrink-0" }),
    );
    expect(html).toContain("shrink-0");
  });
});

describe("StatusBadge — reduced motion (CSS only — verifiable in markup)", () => {
  it("spinner element uses the status-spinner class (animation controlled by CSS @media prefers-reduced-motion)", () => {
    const html = renderToStaticMarkup(
      React.createElement(StatusBadge, { status: "in_progress" }),
    );
    expect(html).toContain('class="status-spinner"');
  });
});
