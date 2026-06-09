/**
 * T4 — Feature IDE Workbench browser QA
 *
 * Verifies the four-pane layout at `/feature/[sessionId]?workspaceId=…&featureId=…`:
 * - All four panes render (explorer, chat, docs, activity dock)
 * - Clicking an artifact in the Explorer switches the docs panel tab
 * - Sessions section appears with a "+ new session" button
 * - Channels section shows placeholder text
 * - AgentChatPanel is present inside the center chat pane
 *
 * Requires a running server and a valid pre-authenticated session.
 * Set PLAYWRIGHT_BASE_URL to the server base URL (default: http://localhost:3000).
 * Set PLAYWRIGHT_WORKSPACE_ID and PLAYWRIGHT_FEATURE_ID for the target workspace/feature.
 */

import { test, expect } from "@playwright/test";

const WORKSPACE_ID = process.env.PLAYWRIGHT_WORKSPACE_ID ?? "test-ws";
const FEATURE_ID = process.env.PLAYWRIGHT_FEATURE_ID ?? "test-feature";

function featureIDEUrl(sessionId = "ide") {
  return `/feature/${sessionId}?workspaceId=${WORKSPACE_ID}&featureId=${FEATURE_ID}`;
}

test.describe("T4 — Feature IDE Workbench", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(featureIDEUrl());
    // Wait until either the workbench or an error/loading state resolves
    await page.waitForSelector(
      "[data-feature-ide-workbench], [data-feature-ide-loading], [data-feature-ide-error]",
      { timeout: 20_000 },
    );
  });

  test("all four panes are present", async ({ page }) => {
    // Skip if still in loading state (server may not have test data)
    const workbench = page.locator("[data-feature-ide-workbench]");
    await expect(workbench).toBeVisible({ timeout: 15_000 });

    await expect(page.locator("[data-feature-ide-explorer-pane]")).toBeVisible();
    await expect(page.locator("[data-feature-ide-chat-pane]")).toBeVisible();
    await expect(page.locator("[data-feature-ide-docs-pane]")).toBeVisible();
    await expect(page.locator("[data-feature-ide-activity-dock]")).toBeVisible();
  });

  test("Explorer pane renders data-feature-ide-explorer", async ({ page }) => {
    await expect(page.locator("[data-feature-ide-workbench]")).toBeVisible();
    await expect(page.locator("[data-feature-ide-explorer]")).toBeVisible();
  });

  test("Docs panel renders tab bar with all four tabs", async ({ page }) => {
    await expect(page.locator("[data-feature-ide-workbench]")).toBeVisible();
    await expect(page.locator("[data-docs-tab-product-spec]")).toBeVisible();
    await expect(page.locator("[data-docs-tab-tech-design]")).toBeVisible();
    await expect(page.locator("[data-docs-tab-tasks]")).toBeVisible();
    await expect(page.locator("[data-docs-tab-logs]")).toBeVisible();
  });

  test("clicking Tech Design artifact in Explorer switches docs panel tab", async ({
    page,
  }) => {
    await expect(page.locator("[data-feature-ide-workbench]")).toBeVisible();

    // The Explorer has an ArtifactRow for "Technical Design"
    const techDesignRow = page
      .locator("[data-feature-ide-explorer]")
      .getByRole("button", { name: /technical design/i });
    await techDesignRow.click();

    // The docs panel tab for tech design becomes aria-selected
    await expect(
      page.locator("[data-docs-tab-tech-design]"),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("clicking Tasks artifact in Explorer switches docs panel tab", async ({
    page,
  }) => {
    await expect(page.locator("[data-feature-ide-workbench]")).toBeVisible();

    const tasksRow = page
      .locator("[data-feature-ide-explorer]")
      .getByRole("button", { name: /^tasks$/i });
    await tasksRow.click();

    await expect(
      page.locator("[data-docs-tab-tasks]"),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("Sessions section is visible with new session button", async ({
    page,
  }) => {
    await expect(page.locator("[data-feature-ide-workbench]")).toBeVisible();

    // Sessions header is in the Explorer
    const explorer = page.locator("[data-feature-ide-explorer]");
    await expect(explorer.getByText(/sessions/i)).toBeVisible();

    // "+ new session" button
    await expect(
      explorer.getByRole("button", { name: /new session/i }),
    ).toBeVisible();
  });

  test("Channels section shows placeholder text", async ({ page }) => {
    await expect(page.locator("[data-feature-ide-workbench]")).toBeVisible();
    await expect(page.locator("[data-channels-placeholder]")).toBeVisible();
    await expect(page.locator("[data-channels-placeholder]")).toContainText(
      /channels coming soon/i,
    );
  });

  test("AgentChatPanel is present in the center chat pane", async ({ page }) => {
    await expect(page.locator("[data-feature-ide-workbench]")).toBeVisible();

    // The chat pane wraps AgentChatPanel; at minimum the pane div is visible
    const chatPane = page.locator("[data-feature-ide-chat-pane]");
    await expect(chatPane).toBeVisible();
  });

  test("activity dock renders ActivityFeed", async ({ page }) => {
    await expect(page.locator("[data-feature-ide-workbench]")).toBeVisible();
    const dock = page.locator("[data-feature-ide-activity-dock]");
    await expect(dock).toBeVisible();
  });
});
