import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const mockWorkspaceContext = vi.hoisted(() => ({
  summaries: [
    {
      workspaceId: "ws-1",
      name: "Startup Project",
      repo_url: "https://github.com/acme/startup.git",
      default_branch: "main",
      last_opened_at: "2026-05-22T00:00:00Z",
    },
  ],
  selectedWorkspaceId: "ws-1",
  selectWorkspace: vi.fn(),
}));

vi.mock("@/features/workspaces/context/WorkspaceContext", () => ({
  useWorkspaceContext: () => mockWorkspaceContext,
}));

vi.mock("@/features/workspaces/components/ImportModal", () => ({
  ImportModal: () => React.createElement("div", { "data-import-modal": true }),
}));

import { WorkspaceSwitcher } from "../features/workspaces/components/WorkspaceSwitcher/WorkspaceSwitcher";

describe("WorkspaceSwitcher", () => {
  it("renders a combined workspace label and active workspace trigger", () => {
    const html = renderToStaticMarkup(React.createElement(WorkspaceSwitcher));

    expect(html).toContain('aria-label="Back to kanban board"');
    expect(html).toContain('aria-label="Switch workspace"');
    expect(html).toContain("h-8");
    expect(html).not.toContain("text-2xl");
    expect(html).toContain("Workspace");
    expect(html).toContain("Startup Project");
  });
});
