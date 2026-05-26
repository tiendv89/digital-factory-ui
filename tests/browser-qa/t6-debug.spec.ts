/**
 * T6 Browser QA — Debug test to verify Playwright + Next.js setup
 */
import { test, expect } from "@playwright/test";

test("dev server is accessible", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  const title = await page.title();
  expect(title).toBe("Workflow Dashboard");
  console.log("Page title:", title);
});

test("board page loads (may show loading state)", async ({ page }) => {
  await page.goto("/board");
  // Wait for the page to be fully loaded
  await page.waitForLoadState("networkidle");
  
  const content = await page.content();
  console.log("Board content length:", content.length);
  
  // Check if loading state is shown or if it redirected
  if (content.includes("Loading workspace")) {
    console.log("Board is in loading state — workspace not yet loaded");
  }
  if (content.includes("Connect a Workspace")) {
    console.log("Redirected to connect page");
  }
  if (content.includes("data-feature-card-status")) {
    console.log("Board rendered with feature cards!");
  }
});
