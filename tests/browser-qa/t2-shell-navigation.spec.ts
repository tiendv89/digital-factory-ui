/**
 * T2 — App shell smoke test: NavRail navigation across routes
 *
 * Requires a running dev/prod server and a valid user session.
 * Set PLAYWRIGHT_BASE_URL and ensure the user is pre-authenticated
 * (or set a test session cookie via storageState).
 *
 * Covers:
 * - Shell layout is present on /board (NavRail + Topbar)
 * - NavRail links navigate to /inbox, /team, /settings
 * - Active nav item is highlighted after navigation
 * - /login does NOT render the shell
 */

import { test, expect } from "@playwright/test";

test.describe("T2 — App shell navigation", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to board as starting point; authentication is expected via
    // session cookie from storageState or a pre-existing cookie jar.
    await page.goto("/board");
  });

  test("shell renders NavRail and Topbar on /board", async ({ page }) => {
    await expect(page.locator("[data-navrail]")).toBeVisible();
    await expect(page.locator("[data-topbar]")).toBeVisible();
  });

  test("NavRail has links for all primary routes", async ({ page }) => {
    await expect(page.locator("[data-nav-item='board']")).toBeVisible();
    await expect(page.locator("[data-nav-item='inbox']")).toBeVisible();
    await expect(page.locator("[data-nav-item='team']")).toBeVisible();
    await expect(page.locator("[data-nav-item='settings']")).toBeVisible();
  });

  test("clicking Inbox nav item navigates to /inbox", async ({ page }) => {
    await page.locator("[data-nav-item='inbox']").click();
    await expect(page).toHaveURL(/\/inbox/);
    await expect(page.locator("[data-inbox-page]")).toBeVisible();
  });

  test("clicking Team nav item navigates to /team", async ({ page }) => {
    await page.locator("[data-nav-item='team']").click();
    await expect(page).toHaveURL(/\/team/);
    await expect(page.locator("[data-team-page]")).toBeVisible();
  });

  test("clicking Settings nav item navigates to /settings", async ({
    page,
  }) => {
    await page.locator("[data-nav-item='settings']").click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator("[data-settings-page]")).toBeVisible();
  });

  test("active nav item has aria-current='page'", async ({ page }) => {
    // Board should be active on /board
    const boardLink = page.locator("[data-nav-item='board']");
    await expect(boardLink).toHaveAttribute("aria-current", "page");

    // Navigate to inbox — inbox becomes active
    await page.goto("/inbox");
    const inboxLink = page.locator("[data-nav-item='inbox']");
    await expect(inboxLink).toHaveAttribute("aria-current", "page");
  });

  test("Topbar shows correct breadcrumb for each route", async ({ page }) => {
    await expect(page.locator("[data-breadcrumb]")).toHaveText("Board");

    await page.goto("/inbox");
    await expect(page.locator("[data-breadcrumb]")).toHaveText("Inbox");

    await page.goto("/team");
    await expect(page.locator("[data-breadcrumb]")).toHaveText("Team");

    await page.goto("/settings");
    await expect(page.locator("[data-breadcrumb]")).toHaveText("Settings");
  });

  test("Topbar renders org/workspace switcher", async ({ page }) => {
    await expect(
      page.locator("[data-org-workspace-switcher]"),
    ).toBeVisible();
  });

  test("/login does not render the shell NavRail", async ({ page }) => {
    // Navigate directly — auth redirect may occur but the shell should be absent
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-navrail]")).not.toBeVisible();
  });
});
