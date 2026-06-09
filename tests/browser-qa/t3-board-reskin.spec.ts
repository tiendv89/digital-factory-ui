/**
 * T3 — Board (Kanban + List) reskin into shell
 *
 * Covers:
 * - Board page renders in the shell main area
 * - Kanban/List view mode toggle renders and switches views
 * - BoardHeader has a "New" (New Feature) button
 * - BoardControls renders mode toggle (Task/Feature) + view mode (Kanban/List)
 * - List view shows hierarchical feature→task rows
 *
 * Requires a running dev/prod server and a valid user session.
 */

import { test, expect } from "@playwright/test";

test.describe("T3 — Board reskin: view modes and shell integration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/board");
  });

  test("board page renders within the shell (NavRail + Topbar visible)", async ({
    page,
  }) => {
    await expect(page.locator("[data-navrail]")).toBeVisible();
    await expect(page.locator("[data-topbar]")).toBeVisible();
    await expect(page.locator("[data-board-page]")).toBeVisible();
  });

  test("board controls contain both mode and view-mode toggles", async ({
    page,
  }) => {
    await expect(page.locator("[data-board-controls]")).toBeVisible();
    // Mode toggle (Task/Feature) — role="tablist" with aria-label
    await expect(
      page.locator('[role="tablist"][aria-label="Board mode"]'),
    ).toBeVisible();
    // View mode toggle (Kanban/List)
    await expect(page.locator('[data-view-mode-btn="kanban"]')).toBeVisible();
    await expect(page.locator('[data-view-mode-btn="list"]')).toBeVisible();
  });

  test("board header renders a New Feature button", async ({ page }) => {
    await expect(page.locator("[data-workspace-header]")).toBeVisible();
    await expect(page.locator("[data-new-feature-btn]")).toBeVisible();
  });

  test("kanban view is shown by default", async ({ page }) => {
    // The kanban board div should be present
    await expect(page.locator("[data-kanban-board]")).toBeVisible();
    // The feature hierarchy list should NOT be visible by default
    await expect(
      page.locator("[data-feature-hierarchy-list]"),
    ).not.toBeVisible();
  });

  test("clicking List view shows the hierarchy list view", async ({ page }) => {
    const listBtn = page.locator('[data-view-mode-btn="list"]');
    await listBtn.click();

    await expect(
      page.locator("[data-feature-hierarchy-list]"),
    ).toBeVisible();
  });

  test("clicking Kanban view after List switches back", async ({ page }) => {
    // Switch to list first
    await page.locator('[data-view-mode-btn="list"]').click();
    await expect(page.locator("[data-feature-hierarchy-list]")).toBeVisible();

    // Switch back to kanban
    await page.locator('[data-view-mode-btn="kanban"]').click();
    await expect(
      page.locator("[data-feature-hierarchy-list]"),
    ).not.toBeVisible();
  });

  test("New Feature button opens the import modal", async ({ page }) => {
    await page.locator("[data-new-feature-btn]").click();
    // Import modal should appear
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(
      page.locator('[aria-label="Import workspace"]'),
    ).toBeVisible();
  });
});
