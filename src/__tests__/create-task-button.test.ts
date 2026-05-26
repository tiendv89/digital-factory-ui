import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CreateTaskButton } from "../features/board/components/CreateTaskButton";

describe("CreateTaskButton", () => {
  it("renders a create-task button with the correct accessible label", () => {
    const html = renderToStaticMarkup(
      React.createElement(CreateTaskButton, {
        workspaceName: "test-workspace",
      }),
    );

    expect(html).toContain('aria-label="Create new task"');
    expect(html).toContain("Create Task");
  });

  it("renders the dedicated CreateTaskDialog (not a feature or task detail modal)", () => {
    const html = renderToStaticMarkup(
      React.createElement(CreateTaskButton, {
        workspaceName: "test-workspace",
      }),
    );

    // The dialog is rendered inline — it's the dedicated creation flow.
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');

    // Dialog should contain the dedicated creation content, not a detail modal.
    expect(html).toContain("Create Task");
    expect(html).toContain("Backend Dependency Required");

    // No detail-modal mounts should appear in the output.
    expect(html).not.toContain("data-feature-detail-sheet");
    expect(html).not.toContain("data-task-detail-sheet");
  });

  it("renders the dialog initially hidden (closed state)", () => {
    const html = renderToStaticMarkup(
      React.createElement(CreateTaskButton, {
        workspaceName: "test-workspace",
      }),
    );

    // In the initial render the dialog is present but hidden.
    expect(html).toContain('aria-hidden="true"');
  });

  it("dialog has a close button for accessibility", () => {
    const html = renderToStaticMarkup(
      React.createElement(CreateTaskButton, {
        workspaceName: "test-workspace",
      }),
    );

    // The backdrop close button.
    expect(html).toContain('aria-label="Close create task dialog"');
    // The X close button in the header.
    expect(html).toContain('aria-label="Close"');
  });

  it("dialog shows the workspace name", () => {
    const html = renderToStaticMarkup(
      React.createElement(CreateTaskButton, {
        workspaceName: "my-project",
      }),
    );

    expect(html).toContain("my-project");
  });

  it("dialog documents the missing task-creation write contract", () => {
    const html = renderToStaticMarkup(
      React.createElement(CreateTaskButton, {
        workspaceName: "any-workspace",
      }),
    );

    // The dialog must surface the backend dependency, not fake creation locally.
    expect(html).toContain(
      "POST /api/workspaces/:workspaceId/tasks",
    );
    expect(html).toContain("How to Create Tasks Today");
    expect(html).toContain("What the Backend Needs");
  });
});
