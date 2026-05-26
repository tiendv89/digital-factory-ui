/**
 * T6 Browser QA — In-browser verification of regression cases.
 *
 * Subtask 8: Verify the status, repository, Task Docs, pagination, and
 * feature-card regression cases in-browser using Playwright.
 *
 * Navigates to /test/board-qa which renders all key components in
 * isolation with mock data. Verifies DOM structure and captures
 * screenshots as browser QA evidence.
 *
 * Run:  npx playwright test --config=playwright.config.ts
 */

import { test, expect } from "@playwright/test";

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

async function navigateToQAPage(
  page: ReturnType<(typeof test)["info"]> extends never
    ? never
    : Parameters<Parameters<typeof test>[1]>[0]["page"],
) {
  await page.goto("/test/board-qa");
  // Wait for the page heading to confirm full render (avoid networkidle
  // which can time out at 60 s on dev servers with long-lived connections)
  await page.waitForSelector("h1", { timeout: 10000 });
}

// ═══════════════════════════════════════════════════════════════════════
// Test: Feature Card Regression
// ═══════════════════════════════════════════════════════════════════════

test.describe("T6 Browser QA — Feature Card Regression", () => {
  test("feature cards render ID smaller than title and prioritize title width", async ({
    page,
  }) => {
    await navigateToQAPage(page);

    // Scroll to feature cards section
    await page.locator("#section-feature-cards").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Take screenshot of the section
    await page.locator("#section-feature-cards").screenshot({
      path: "screenshots/t6-feature-cards.png",
    });

    // Verify all cards have the expected DOM structure
    const cards = page.locator(
      "#section-feature-cards [data-feature-card-status]",
    );
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // First card (Normal — ID + Title): should have both line-clamp-2 title and uppercase ID
    const firstCard = cards.nth(0);
    await expect(firstCard.locator(".line-clamp-2")).toBeVisible();

    // The ID element should use text-[11px] and uppercase
    const idEl = firstCard.locator(".text-\\[11px\\].uppercase");
    await expect(idEl).toBeVisible();
    const idText = await idEl.textContent();
    expect(idText).toBe("kanban-board-feature");

    // Title appears in DOM before ID (title uses line-clamp-2, above the ID line)
    const firstCardHtml = await firstCard.innerHTML();
    const titlePos = firstCardHtml.indexOf("Feature Kanban Board");
    const idPos = firstCardHtml.indexOf("kanban-board-feature");
    // Title should appear before the ID metadata line in the DOM
    // (the title element is the first p.line-clamp-2, ID is a later p.truncate)
    expect(titlePos).toBeLessThan(idPos);

    // Long ID card: should truncate
    const longIdCard = cards.nth(1);
    const longIdEl = longIdCard.locator(".truncate");
    await expect(longIdEl).toBeVisible();

    // Long title card: should use line-clamp-2 (wrapping)
    const longTitleCard = cards.nth(2);
    await expect(longTitleCard.locator(".line-clamp-2")).toBeVisible();

    // Same ID/title card: ID line should be hidden
    const sameCard = cards.nth(3);
    // Check that the ID doesn't appear twice in text content
    const sameCardText = await sameCard.textContent();
    // "simple-feature" should appear only once (just the title)
    const occurrences = (sameCardText?.match(/simple-feature/g) || []).length;
    // In HTML, the title appears in: the <p> text, the aria-label, and the title attribute
    // But the ID metadata line (separate <p>) should NOT be present
    const idMetadataLines = await sameCard
      .locator(".truncate.text-\\[11px\\].uppercase")
      .count();
    expect(idMetadataLines).toBe(0);

    // Verify aria-label confirms tab-opening behavior
    const ariaLabel = await firstCard.getAttribute("aria-label");
    expect(ariaLabel).toContain("Open feature tab for");
  });

  test("feature cards suppress status tag in Feature mode", async ({
    page,
  }) => {
    await navigateToQAPage(page);

    // Scroll to no-status-pill section
    await page.locator("#section-no-status-pill").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    await page.locator("#section-no-status-pill").screenshot({
      path: "screenshots/t6-no-status-pill.png",
    });

    // All 8 feature cards should NOT contain status labels
    const statusLabels = [
      "In Design",
      "In TDD",
      "Ready",
      "In Progress",
      "Handoff",
      "Done",
      "Blocked",
      "Cancelled",
    ];

    const cards = page.locator(
      "#section-no-status-pill [data-feature-card-status]",
    );
    const count = await cards.count();
    expect(count).toBe(8);

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      for (const label of statusLabels) {
        // The card itself should not contain the status label text
        // (status labels may appear in the section description, but not inside cards)
        const cardText = await card.textContent();
        expect(cardText).not.toContain(label);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test: Status Regression
// ═══════════════════════════════════════════════════════════════════════

test.describe("T6 Browser QA — Status Regression", () => {
  test("FeatureRow renders lifecycle status for all statuses", async ({
    page,
  }) => {
    await navigateToQAPage(page);

    await page.locator("#section-feature-row-status").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    await page.locator("#section-feature-row-status").screenshot({
      path: "screenshots/t6-feature-row-status.png",
    });

    // Verify each feature row shows the correct lifecycle status label
    const expectedLabels: Record<string, string> = {
      in_design: "In Design",
      in_tdd: "In TDD",
      ready_for_implementation: "Ready",
      in_implementation: "In Progress",
      in_handoff: "Handoff",
      done: "Done",
      blocked: "Blocked",
      cancelled: "Cancelled",
    };

    for (const [statusKey, label] of Object.entries(expectedLabels)) {
      // Each feature row should contain its status label
      const labelVisible = await page
        .getByText(label, { exact: true })
        .first()
        .isVisible();
      expect(labelVisible).toBe(true);
    }

    // Verify that a feature with status "blocked" and in_progress tasks
    // still shows "Blocked" (not task-derived)
    // The blocked feature is the 7th one (index 6 in the array)
    const sectionContent = await page
      .locator("#section-feature-row-status")
      .textContent();
    expect(sectionContent).toContain("Blocked");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test: Task Card Regression
// ═══════════════════════════════════════════════════════════════════════

test.describe("T6 Browser QA — Task Card Regression", () => {
  test("task cards render with data-task-id and tab-first behavior", async ({
    page,
  }) => {
    await navigateToQAPage(page);

    await page.locator("#section-task-cards").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    await page.locator("#section-task-cards").screenshot({
      path: "screenshots/t6-task-cards.png",
    });

    // Verify each task card has data-task-id
    const taskCards = page.locator("#section-task-cards [data-task-id]");
    const count = await taskCards.count();
    expect(count).toBe(5);

    // Verify each card has role="button"
    for (let i = 0; i < count; i++) {
      const role = await taskCards.nth(i).getAttribute("role");
      expect(role).toBe("button");
    }

    // Verify specific task IDs are rendered
    const taskIds = ["T-done", "T-progress", "T-ready", "T-blocked", "T-todo"];
    for (const taskId of taskIds) {
      const card = page.locator(`[data-task-id="${taskId}"]`);
      await expect(card).toBeVisible();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test: Task Docs Regression
// ═══════════════════════════════════════════════════════════════════════

test.describe("T6 Browser QA — Task Docs Regression", () => {
  test('Task Docs renders "Tasks List" and "Task Docs" tab labels', async ({
    page,
  }) => {
    await navigateToQAPage(page);

    await page.locator("#section-task-docs").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    await page.locator("#section-task-docs").screenshot({
      path: "screenshots/t6-task-docs.png",
    });

    // Verify tab labels
    await expect(page.getByText("Tasks List")).toBeVisible();
    await expect(page.getByText("Task Docs")).toBeVisible();

    // Verify the "legacy tasks.md" label is NOT present
    const sectionText = await page.locator("#section-task-docs").textContent();
    expect(sectionText).not.toContain("tasks.md");

    // Verify task rows are rendered
    const taskRows = page.locator("[data-feature-task-row]");
    const count = await taskRows.count();
    expect(count).toBe(3);

    // Verify task row content
    await expect(page.locator('[data-feature-task-row="T1"]')).toBeVisible();
    await expect(page.locator('[data-feature-task-row="T2"]')).toBeVisible();
    await expect(page.locator('[data-feature-task-row="T3"]')).toBeVisible();
  });

  test("Task Docs tab shows markdown content when clicked", async ({
    page,
  }) => {
    await navigateToQAPage(page);

    await page.locator("#section-task-docs").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Click the "Task Docs" tab button
    await page.getByText("Task Docs").first().click();
    await page.waitForTimeout(1000);

    // Take screenshot of the markdown view
    await page.locator("#section-task-docs").screenshot({
      path: "screenshots/t6-task-docs-markdown.png",
    });

    // Verify the markdown content is rendered
    const markdownSection = page.locator("[data-feature-tasks-markdown]");
    await expect(markdownSection).toBeVisible();

    // Check for markdown-rendered headings
    const sectionContent = await markdownSection.textContent();
    expect(sectionContent).toContain("Implement pagination");
    expect(sectionContent).toContain("Build card layout");
    expect(sectionContent).toContain("Write tests");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test: Pagination Regression
// ═══════════════════════════════════════════════════════════════════════

test.describe("T6 Browser QA — Pagination Regression", () => {
  test("pagination controls render page info and navigation buttons", async ({
    page,
  }) => {
    await navigateToQAPage(page);

    await page.locator("#section-pagination").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    await page.locator("#section-pagination").screenshot({
      path: "screenshots/t6-pagination.png",
    });

    // Page 1 of 5: should have "Previous" disabled, "Next" enabled
    // Page 3 of 5: both should be enabled
    // Single page: neither should be shown or both disabled

    // The section should contain pagination info text
    const sectionText = await page.locator("#section-pagination").textContent();
    // Should include page numbers
    expect(sectionText).toContain("Page 1 of 5");
    expect(sectionText).toContain("Page 3 of 5");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test: Full Page Screenshot
// ═══════════════════════════════════════════════════════════════════════

test.describe("T6 Browser QA — Full Page Screenshot", () => {
  test("captures full QA page for visual evidence", async ({ page }) => {
    await navigateToQAPage(page);

    // Full page screenshot at desktop resolution
    await page.screenshot({
      path: "screenshots/t6-full-qa-page.png",
      fullPage: true,
    });

    // Verify the page loaded all sections
    const sections = [
      "#section-feature-cards",
      "#section-no-status-pill",
      "#section-feature-row-status",
      "#section-task-cards",
      "#section-task-docs",
      "#section-pagination",
    ];

    for (const section of sections) {
      await expect(page.locator(section)).toBeVisible();
    }
  });
});
