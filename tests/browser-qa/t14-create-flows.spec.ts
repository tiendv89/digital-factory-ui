/**
 * T14 Browser QA — Create-org + create-workspace E2E happy paths.
 *
 * Intercepts /api/me to inject controlled sessions, then drives the
 * create-org and create-workspace flows end-to-end via Playwright.
 *
 * Run: npx playwright test tests/browser-qa/t14-create-flows.spec.ts
 */

import { test, expect } from "@playwright/test";

// ─── Session fixtures ─────────────────────────────────────────────────────────

/** No org memberships → EmptyState shows "Create Organization" button. */
const NO_ORG_SESSION = {
  data: {
    user: {
      id: "u-no-org",
      email: "newuser@example.com",
      display_name: "New User",
      avatar_url: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    memberships: [],
    accessible_workspace_ids: [],
  },
};

/** One org, no accessible workspaces → OrgWorkspaceSwitcher shows "New Workspace". */
const WITH_ORG_NO_WORKSPACE_SESSION = {
  data: {
    user: {
      id: "u-with-org",
      email: "member@example.com",
      display_name: "Org Member",
      avatar_url: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    memberships: [
      {
        organization_id: "org-1",
        organization_slug: "acme",
        organization_name: "Acme Corp",
        role: "member",
      },
    ],
    accessible_workspace_ids: [],
  },
};

// ─── Create-org happy path ────────────────────────────────────────────────────

test.describe("T14 — Create-org happy path", () => {
  test("shows Create Organization button in EmptyState when user has no org", async ({
    page,
  }) => {
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(NO_ORG_SESSION),
      });
    });

    await page.goto("/board");
    await page.waitForTimeout(3000);

    const createOrgBtn = page.getByTestId("empty-state-create-org");
    await expect(createOrgBtn).toBeVisible({ timeout: 10_000 });
    await expect(createOrgBtn).toContainText("Create Organization");
  });

  test("opens CreateOrgModal when Create Organization button is clicked", async ({
    page,
  }) => {
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(NO_ORG_SESSION),
      });
    });

    await page.goto("/board");
    await page.waitForTimeout(3000);

    await page.getByTestId("empty-state-create-org").click();

    const modal = page.locator("[data-create-org-modal]");
    await expect(modal).toBeVisible({ timeout: 8_000 });
    await expect(modal.getByRole("heading")).toContainText("Create Organization");
  });

  test("slug auto-fills from organization name", async ({ page }) => {
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(NO_ORG_SESSION),
      });
    });

    await page.goto("/board");
    await page.waitForTimeout(3000);

    await page.getByTestId("empty-state-create-org").click();
    await page.waitForSelector("[data-create-org-modal]", { timeout: 8_000 });

    const nameInput = page.getByLabel("Organization name");
    const slugInput = page.getByLabel("Organization slug");

    await nameInput.fill("Acme Corp");

    // Slug should auto-fill to the slugified version
    await expect(slugInput).toHaveValue("acme-corp", { timeout: 3_000 });

    await page.screenshot({ path: "screenshots/t14-create-org-modal-filled.png" });
  });

  test("submit button is disabled until name and slug are filled", async ({
    page,
  }) => {
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(NO_ORG_SESSION),
      });
    });

    await page.goto("/board");
    await page.waitForTimeout(3000);

    await page.getByTestId("empty-state-create-org").click();
    await page.waitForSelector("[data-create-org-modal]", { timeout: 8_000 });

    const submitBtn = page.locator("[data-create-org-submit]");
    await expect(submitBtn).toBeDisabled();

    await page.getByLabel("Organization name").fill("Acme Corp");
    await expect(submitBtn).not.toBeDisabled();
  });

  test("modal closes after successful org creation", async ({ page }) => {
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(NO_ORG_SESSION),
      });
    });

    // Mock the POST /api/orgs endpoint to return success
    await page.route("**/api/orgs", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "org-new-1",
            name: "Acme Corp",
            slug: "acme-corp",
            created_at: "2026-06-09T00:00:00Z",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/board");
    await page.waitForTimeout(3000);

    await page.getByTestId("empty-state-create-org").click();
    await page.waitForSelector("[data-create-org-modal]", { timeout: 8_000 });

    await page.getByLabel("Organization name").fill("Acme Corp");
    await page.locator("[data-create-org-submit]").click();

    // Modal should close after successful submission
    await expect(page.locator("[data-create-org-modal]")).not.toBeVisible({
      timeout: 8_000,
    });

    await page.screenshot({ path: "screenshots/t14-create-org-success.png" });
  });
});

// ─── Create-workspace happy path ──────────────────────────────────────────────

test.describe("T14 — Create-workspace happy path", () => {
  test("shows New Workspace button in OrgWorkspaceSwitcher when org exists but no workspaces", async ({
    page,
  }) => {
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(WITH_ORG_NO_WORKSPACE_SESSION),
      });
    });

    await page.goto("/board");
    await page.waitForTimeout(3000);

    // The OrgWorkspaceSwitcher in the Topbar shows "New Workspace" when org
    // exists but no accessible workspaces are present.
    const newWorkspaceBtn = page.locator("[data-create-workspace-trigger]");
    await expect(newWorkspaceBtn).toBeVisible({ timeout: 10_000 });

    await page.screenshot({
      path: "screenshots/t14-new-workspace-trigger-visible.png",
    });
  });

  test("opens CreateWorkspaceModal when New Workspace trigger is clicked", async ({
    page,
  }) => {
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(WITH_ORG_NO_WORKSPACE_SESSION),
      });
    });

    await page.goto("/board");
    await page.waitForTimeout(3000);

    await page.locator("[data-create-workspace-trigger]").click();

    const modal = page.locator("[data-create-workspace-modal]");
    await expect(modal).toBeVisible({ timeout: 8_000 });
    await expect(modal.getByRole("heading")).toContainText("Create Workspace");
  });

  test("slug auto-fills from workspace name", async ({ page }) => {
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(WITH_ORG_NO_WORKSPACE_SESSION),
      });
    });

    await page.goto("/board");
    await page.waitForTimeout(3000);

    await page.locator("[data-create-workspace-trigger]").click();
    await page.waitForSelector("[data-create-workspace-modal]", {
      timeout: 8_000,
    });

    const nameInput = page.getByLabel("Workspace name");
    const slugInput = page.getByLabel("Workspace slug");

    await nameInput.fill("My Project Alpha");

    // Slug should auto-fill to the slugified version
    await expect(slugInput).toHaveValue("my-project-alpha", { timeout: 3_000 });

    await page.screenshot({
      path: "screenshots/t14-create-workspace-modal-filled.png",
    });
  });

  test("submit button is disabled until name and slug are filled", async ({
    page,
  }) => {
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(WITH_ORG_NO_WORKSPACE_SESSION),
      });
    });

    await page.goto("/board");
    await page.waitForTimeout(3000);

    await page.locator("[data-create-workspace-trigger]").click();
    await page.waitForSelector("[data-create-workspace-modal]", {
      timeout: 8_000,
    });

    const submitBtn = page.locator("[data-create-workspace-submit]");
    await expect(submitBtn).toBeDisabled();

    await page.getByLabel("Workspace name").fill("My Project Alpha");
    await expect(submitBtn).not.toBeDisabled();
  });

  test("modal closes after successful workspace creation", async ({ page }) => {
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(WITH_ORG_NO_WORKSPACE_SESSION),
      });
    });

    // Mock POST /api/workspaces — workflow-backend wraps in { success, data }
    await page.route("**/api/workspaces", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              id: "ws-new-1",
              name: "My Project Alpha",
              slug: "my-project-alpha",
              repo_url: "",
              source_state: { stale: false },
              updated_at: "2026-06-09T00:00:00Z",
              features: [],
              tasks: [],
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Also stub /api/workspaces/ws-new-1 since WorkspaceContext will load it
    await page.route("**/api/workspaces/ws-new-1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "ws-new-1",
            name: "My Project Alpha",
            slug: "my-project-alpha",
            repo_url: "",
            source_state: { stale: false },
            updated_at: "2026-06-09T00:00:00Z",
            features: [],
            tasks: [],
          },
        }),
      });
    });

    await page.goto("/board");
    await page.waitForTimeout(3000);

    await page.locator("[data-create-workspace-trigger]").click();
    await page.waitForSelector("[data-create-workspace-modal]", {
      timeout: 8_000,
    });

    await page.getByLabel("Workspace name").fill("My Project Alpha");
    await page.locator("[data-create-workspace-submit]").click();

    // Modal should close after successful submission
    await expect(page.locator("[data-create-workspace-modal]")).not.toBeVisible({
      timeout: 8_000,
    });

    await page.screenshot({ path: "screenshots/t14-create-workspace-success.png" });
  });
});
