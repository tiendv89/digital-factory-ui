/**
 * T5 E2E — EmptyState Playwright tests.
 *
 * Verifies that a zero-membership user sees the EmptyState component
 * (friendly message + logout button) and never the /connect import form.
 *
 * The tests intercept /api/me to inject sessions with accessible_workspace_ids: []
 * and confirm the EmptyState renders at both the root route and /board.
 *
 * Run: npx playwright test tests/browser-qa/t5-empty-state.spec.ts
 */

import { test, expect } from "@playwright/test";

const ZERO_MEMBERSHIP_CLIENT_SESSION = {
  user: {
    id: "u-client-zero",
    email: "newclient@example.com",
    display_name: "New Client",
    avatar_url: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  memberships: [
    {
      organization_id: "org-1",
      organization_slug: "acme",
      organization_name: "Acme Corp",
      role: "client_member",
    },
  ],
  accessible_workspace_ids: [],
};

const ZERO_MEMBERSHIP_ADMIN_SESSION = {
  user: {
    id: "u-admin-zero",
    email: "admin@example.com",
    display_name: "Platform Admin",
    avatar_url: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  memberships: [
    {
      organization_id: "org-1",
      organization_slug: "acme",
      organization_name: "Acme Corp",
      role: "platform_admin",
    },
  ],
  accessible_workspace_ids: [],
};

test.describe("T5 — EmptyState for zero-membership user", () => {
  test("client_member with no accessible workspaces sees EmptyState at /board, not the /connect form", async ({
    page,
  }) => {
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ZERO_MEMBERSHIP_CLIENT_SESSION),
      });
    });

    // Also stub local-workspace-store to ensure summaries is empty
    await page.goto("/board");
    await page.waitForTimeout(3000);

    const pageText = await page.textContent("body");

    // Must see the EmptyState message
    expect(pageText).toContain(
      "Your workspace will appear here as soon as your engagement is set up",
    );
    expect(pageText).toContain("contact your delivery lead");

    // Must NOT see the import/connect form (which was the old redirect target)
    expect(pageText).not.toContain("Connect workspace");
    expect(pageText).not.toContain("Import workspace");
  });

  test("client_member at root route with no accessible workspaces sees EmptyState", async ({
    page,
  }) => {
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ZERO_MEMBERSHIP_CLIENT_SESSION),
      });
    });

    await page.goto("/");
    await page.waitForTimeout(3000);

    const pageText = await page.textContent("body");
    expect(pageText).toContain(
      "Your workspace will appear here as soon as your engagement is set up",
    );
    expect(pageText).not.toContain("Connect workspace");
    expect(pageText).not.toContain("Import workspace");
  });

  test("platform_admin with no accessible workspaces sees EmptyState + Import workspace link at /board", async ({
    page,
  }) => {
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ZERO_MEMBERSHIP_ADMIN_SESSION),
      });
    });

    await page.goto("/board");
    await page.waitForTimeout(3000);

    const pageText = await page.textContent("body");

    // Should see the friendly message
    expect(pageText).toContain(
      "Your workspace will appear here as soon as your engagement is set up",
    );

    // Should see the Import workspace link
    expect(pageText).toContain("Import workspace");

    // The import link should point to /admin/connect
    const importLink = page.getByTestId("empty-state-import-link");
    await expect(importLink).toBeVisible();
    const href = await importLink.getAttribute("href");
    expect(href).toBe("/admin/connect");
  });

  test("EmptyState renders the Sign out button", async ({ page }) => {
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ZERO_MEMBERSHIP_CLIENT_SESSION),
      });
    });

    await page.goto("/board");
    await page.waitForTimeout(3000);

    const logoutBtn = page.getByTestId("empty-state-logout");
    await expect(logoutBtn).toBeVisible();
  });
});
