/**
 * T4 E2E — Admin layout guard Playwright test.
 *
 * Verifies that a client_member directly navigating to /admin/connect
 * receives a 404 page (not the import form).
 *
 * The admin layout guard calls notFound() when the session has no
 * platform_admin membership. This test intercepts /api/me to inject a
 * client_member session and confirms the 404 outcome.
 *
 * Run: npx playwright test tests/browser-qa/t4-admin-guard.spec.ts
 */

import { test, expect } from "@playwright/test";

const CLIENT_MEMBER_SESSION = {
  user: {
    id: "u-client-1",
    email: "client@example.com",
    display_name: "Client User",
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
  accessible_workspace_ids: ["ws-1"],
};

test.describe("T4 — Admin layout guard", () => {
  test("client_member direct-navigating to /admin/connect receives 404", async ({
    page,
  }) => {
    // Intercept /api/me and return a client_member session so the admin
    // layout guard sees a non-admin user and calls notFound().
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(CLIENT_MEMBER_SESSION),
      });
    });

    // Navigate directly to /admin/connect — the restricted admin route.
    await page.goto("/admin/connect");

    // Wait for the client-side session to resolve and notFound() to fire.
    // Next.js renders the 404 boundary after the useEffect in the admin layout
    // completes and the session status transitions from "loading" to "authenticated".
    await page.waitForTimeout(3000);

    // Assert: the page must NOT show the connect / import form.
    const pageText = await page.textContent("body");
    expect(pageText).not.toContain("Connect workspace");
    expect(pageText).not.toContain("Import workspace");

    // Assert: the page shows a 404 indicator. Next.js default 404 page
    // contains the text "404" and "This page could not be found".
    // A custom not-found boundary would also be acceptable — we check for
    // the numeric "404" as the minimum required signal.
    expect(pageText).toContain("404");
  });
});
