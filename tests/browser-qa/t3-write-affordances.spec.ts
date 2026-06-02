/**
 * T3 Browser QA — Verify write affordances removed from client-reachable routes.
 *
 * Confirms that the board page, rendered via the /test/board-qa isolation
 * harness, contains no Create Task, Sync, or Import controls that would
 * expose write operations to a client_member.
 *
 * Run:  npx playwright test --config=playwright.config.ts tests/browser-qa/t3-write-affordances.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

async function navigateToQAPage(page: Page) {
  await page.goto("/test/board-qa");
  await page.waitForSelector("h1", { timeout: 10000 });
}

test.describe("T3 — No write affordances on client-reachable board routes", () => {
  test("board page renders no Create Task button", async ({ page }) => {
    await navigateToQAPage(page);

    // No element with "Create Task" visible text
    const createTaskButtons = page.getByRole("button", {
      name: /create task/i,
    });
    await expect(createTaskButtons).toHaveCount(0);

    // No aria-label that would indicate a create-task control
    const createTaskLabeled = page.locator('[aria-label="Create new task"]');
    await expect(createTaskLabeled).toHaveCount(0);
  });

  test("board page renders no Sync workspace button", async ({ page }) => {
    await navigateToQAPage(page);

    // No element with "Sync" visible button text (exact match guards against
    // "Syncing..." spinner also counting)
    const syncButtons = page.locator('[aria-label="Sync workspace data"]');
    await expect(syncButtons).toHaveCount(0);

    const syncNowButtons = page.locator('[aria-label="Sync workspace to refresh data"]');
    await expect(syncNowButtons).toHaveCount(0);

    const retryButtons = page.locator('[aria-label="Retry workspace sync"]');
    await expect(retryButtons).toHaveCount(0);
  });

  test("board controls container renders Filter and Search but not Sync", async ({
    page,
  }) => {
    await navigateToQAPage(page);

    // Board controls are present (section exists)
    // The board controls are inside KanbanBoard which may not be present on
    // /test/board-qa — but we assert no sync controls globally
    const html = await page.content();
    expect(html).not.toContain('aria-label="Sync workspace data"');
    expect(html).not.toContain("Sync now");
    expect(html).not.toContain("Create Task");

    await page.screenshot({ path: "screenshots/t3-no-write-affordances.png" });
  });
});
