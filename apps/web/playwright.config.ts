import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for apps/web E2E tests.
 *
 * Base URL  : http://localhost:3001  (Next.js dev server)
 * API URL   : http://localhost:3000  (NestJS backend)
 *
 * All tests mock backend API calls via page.route() so the suite runs
 * without a live NestJS server.
 */

const isCI = !!process.env.CI;

export default defineConfig({
  // Directory that contains the e2e test files
  testDir: "./e2e",

  // Global setup: registers the E2E user and captures auth session state
  globalSetup: "./e2e/global-setup.ts",

  // Artifacts output directory
  outputDir: "test-results/",

  // Run tests inside a file in parallel
  fullyParallel: true,

  // Fail the build on CI if test.only was accidentally left in source
  forbidOnly: isCI,

  // Retry failing tests on CI to reduce flakiness noise
  retries: isCI ? 2 : 0,

  // Single worker in CI; unlimited locally
  workers: isCI ? 1 : undefined,

  // Concise list reporter in CI; rich HTML report locally
  reporter: isCI ? "list" : "html",

  use: {
    // All relative page.goto() calls will use this as the prefix
    baseURL: "http://localhost:3001",

    // Collect Playwright trace on first retry for debugging
    trace: "on-first-retry",

    // Screenshots and video only on failure
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    // Chromium only — fastest in CI and sufficient for critical-path coverage
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Spin up the Next.js dev server before the test run starts.
  // reuseExistingServer lets local development skip the cold start.
  webServer: {
    command: "next dev -p 3001",
    url: "http://localhost:3001",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
