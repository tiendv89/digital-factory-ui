import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for browser QA tests.
 *
 * Uses the locally-installed Chromium headless shell binary.
 * The dev server is started separately — see scripts/run-browser-qa.sh.
 */
export default defineConfig({
  testDir: "./tests/browser-qa",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 1,
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "on",
    video: "retain-on-failure",
    channel: "chromium",
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
        "/home/agent/.cache/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-linux64/chrome-headless-shell",
      env: {
        LD_LIBRARY_PATH:
          process.env.LD_LIBRARY_PATH ??
          "/tmp/playwright-libs/combined-lib",
      },
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: undefined, // managed externally by run-browser-qa.sh
});
