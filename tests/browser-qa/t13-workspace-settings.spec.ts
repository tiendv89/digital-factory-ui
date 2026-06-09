/**
 * T13 Browser QA — Workspace settings UI.
 *
 * Verifies the workspace settings panel is accessible via the Settings
 * sidebar, renders the correct tab structure (Members real; General and
 * Danger zone placeholder), and key UI elements are present.
 *
 * NOTE: These tests navigate to /settings and interact with the workspace-
 * settings sidebar entry. Because the test environment has no real auth or
 * workspace data, we focus on structural and placeholder assertions rather
 * than real API calls.
 *
 * Run: npx playwright test --config=playwright.config.ts tests/browser-qa/t13-workspace-settings.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

const SETTINGS_URL = "/settings";

async function navigateToSettings(page: Page) {
  await page.goto(SETTINGS_URL);
  // Wait for the settings layout to load (sidebar present)
  await page.waitForSelector("[data-settings-page]", { timeout: 15_000 });
}

async function openWorkspaceSettings(page: Page) {
  await navigateToSettings(page);
  const wsSettingsBtn = page.locator("[data-settings-tab='workspace-settings']");
  await wsSettingsBtn.click();
  // Wait for workspace settings panel to appear
  await page.waitForSelector("[data-workspace-settings-page]", { timeout: 10_000 });
}

// ─── Settings sidebar entry ───────────────────────────────────────────────────

test.describe("T13 — Workspace settings sidebar entry", () => {
  test("workspace-settings tab is present in the settings sidebar", async ({ page }) => {
    await navigateToSettings(page);

    const wsSettingsBtn = page.locator("[data-settings-tab='workspace-settings']");
    await expect(wsSettingsBtn).toBeVisible();

    // Should not have 'soon' badge (unlike placeholder entries)
    const soonBadge = wsSettingsBtn.locator("span", { hasText: "soon" });
    await expect(soonBadge).not.toBeVisible();
  });

  test("clicking workspace-settings tab activates it", async ({ page }) => {
    await navigateToSettings(page);

    const wsSettingsBtn = page.locator("[data-settings-tab='workspace-settings']");
    await wsSettingsBtn.click();

    // aria-selected should be true
    await expect(wsSettingsBtn).toHaveAttribute("aria-selected", "true");
  });
});

// ─── Workspace settings tabs ──────────────────────────────────────────────────

test.describe("T13 — Workspace settings tab structure", () => {
  test("renders three tabs: Members, General, Danger zone", async ({ page }) => {
    await openWorkspaceSettings(page);

    const membersTab = page.locator("[data-ws-settings-tab='members']");
    const generalTab = page.locator("[data-ws-settings-tab='general']");
    const dangerTab = page.locator("[data-ws-settings-tab='danger-zone']");

    await expect(membersTab).toBeVisible();
    await expect(generalTab).toBeVisible();
    await expect(dangerTab).toBeVisible();
  });

  test("Members tab is active by default", async ({ page }) => {
    await openWorkspaceSettings(page);

    const membersTab = page.locator("[data-ws-settings-tab='members']");
    await expect(membersTab).toHaveAttribute("aria-selected", "true");
  });

  test("General tab switches panel and shows placeholder", async ({ page }) => {
    await openWorkspaceSettings(page);

    const generalTab = page.locator("[data-ws-settings-tab='general']");
    await generalTab.click();

    await expect(generalTab).toHaveAttribute("aria-selected", "true");

    const generalPanel = page.locator("[data-ws-general-tab]");
    await expect(generalPanel).toBeVisible();

    // Should show D2 placeholder badge
    const badge = generalPanel.locator("[data-placeholder-badge]").first();
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(/managed via import\/sync/i);
  });

  test("Danger zone tab switches panel and shows placeholder", async ({ page }) => {
    await openWorkspaceSettings(page);

    const dangerTab = page.locator("[data-ws-settings-tab='danger-zone']");
    await dangerTab.click();

    await expect(dangerTab).toHaveAttribute("aria-selected", "true");

    const dangerPanel = page.locator("[data-ws-danger-tab]");
    await expect(dangerPanel).toBeVisible();

    const badge = dangerPanel.locator("[data-placeholder-badge]").first();
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(/managed via import\/sync/i);
  });
});

// ─── Members tab structure ────────────────────────────────────────────────────

test.describe("T13 — Members tab real UI structure", () => {
  test("Members panel contains members table and invite form", async ({ page }) => {
    await openWorkspaceSettings(page);

    // Members tab panel should be rendered
    const membersTab = page.locator("[data-ws-members-tab]");
    await expect(membersTab).toBeVisible();

    // Should have the members table section
    const membersTable = membersTab.locator("[data-ws-members-table]");
    await expect(membersTable).toBeVisible();

    // Should have the invite form
    const inviteForm = membersTab.locator("[data-ws-invite-form]");
    await expect(inviteForm).toBeVisible();
  });

  test("Invite form has email input and role select", async ({ page }) => {
    await openWorkspaceSettings(page);

    const emailInput = page.locator("[data-invite-email-input]");
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("type", "email");

    const roleSelect = page.locator("[data-invite-role-select]");
    await expect(roleSelect).toBeVisible();

    const submitBtn = page.locator("[data-invite-submit]");
    await expect(submitBtn).toBeVisible();
    // Should be disabled when email is empty
    await expect(submitBtn).toBeDisabled();
  });

  test("Invite submit enables when email is typed", async ({ page }) => {
    await openWorkspaceSettings(page);

    const emailInput = page.locator("[data-invite-email-input]");
    const submitBtn = page.locator("[data-invite-submit]");

    await emailInput.fill("test@example.com");
    await expect(submitBtn).not.toBeDisabled();
  });

  test("org-role note is visible in the members panel", async ({ page }) => {
    await openWorkspaceSettings(page);

    const membersTable = page.locator("[data-ws-members-table]");
    // The role note about org membership should be present
    const noteText = membersTable.locator("p", { hasText: /org.*membership/i }).or(
      membersTable.locator("p", { hasText: /organisation membership/i }),
    );
    await expect(noteText).toBeVisible();
  });
});

// ─── Screenshot evidence ──────────────────────────────────────────────────────

test.describe("T13 — Visual evidence screenshots", () => {
  test("captures workspace settings Members tab", async ({ page }) => {
    await openWorkspaceSettings(page);

    await page.screenshot({ path: "screenshots/t13-workspace-settings-members.png" });
    await expect(page.locator("[data-workspace-settings-page]")).toBeVisible();
  });

  test("captures workspace settings General tab", async ({ page }) => {
    await openWorkspaceSettings(page);

    await page.locator("[data-ws-settings-tab='general']").click();
    await page.screenshot({ path: "screenshots/t13-workspace-settings-general.png" });
    await expect(page.locator("[data-ws-general-tab]")).toBeVisible();
  });

  test("captures workspace settings Danger zone tab", async ({ page }) => {
    await openWorkspaceSettings(page);

    await page.locator("[data-ws-settings-tab='danger-zone']").click();
    await page.screenshot({ path: "screenshots/t13-workspace-settings-danger.png" });
    await expect(page.locator("[data-ws-danger-tab]")).toBeVisible();
  });
});
