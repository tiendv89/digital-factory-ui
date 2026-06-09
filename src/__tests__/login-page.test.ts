import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/services/user-service", () => ({
  getUserServiceBase: () => "http://localhost:8082",
  fetchMe: vi.fn(),
  logout: vi.fn(),
}));

import LoginPage from "../app/login/page";

describe("LoginPage", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_USER_SERVICE_URL = "http://localhost:8082";
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_USER_SERVICE_URL;
  });

  it("renders Google and GitHub sign-in links", () => {
    const html = renderToStaticMarkup(React.createElement(LoginPage));
    expect(html).toContain("Continue with Google");
    expect(html).toContain("Continue with GitHub");
  });

  it("links to user-service OAuth start endpoints", () => {
    const html = renderToStaticMarkup(React.createElement(LoginPage));
    expect(html).toContain("/auth/google/start");
    expect(html).toContain("/auth/github/start");
  });

  it("renders the sign-in heading", () => {
    const html = renderToStaticMarkup(React.createElement(LoginPage));
    expect(html).toContain("Sign in");
  });

  it("renders the Workflow brand name", () => {
    const html = renderToStaticMarkup(React.createElement(LoginPage));
    expect(html).toContain("Workflow");
  });

  it("renders the VS Code-style status bar", () => {
    const html = renderToStaticMarkup(React.createElement(LoginPage));
    expect(html).toContain("bg-statusbar");
  });

  it("uses dark theme surface and bg classes", () => {
    const html = renderToStaticMarkup(React.createElement(LoginPage));
    expect(html).toContain("bg-bg");
    expect(html).toContain("bg-surface");
  });
});
