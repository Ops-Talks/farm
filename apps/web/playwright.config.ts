import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for apps/web E2E tests.
 *
 * Base URL  : http://localhost:3010  (Next.js dev server — non-default port
 *                                    to avoid conflict with the optional
 *                                    farm-web docker-compose container on 3001)
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
    baseURL: "http://localhost:3010",

    // Collect Playwright trace on first retry for debugging
    trace: "on-first-retry",

    // Screenshots and video only on failure
    screenshot: "only-on-failure",
    video: "retain-on-failure",

    // Allow more time for actions in CI (slower runners, on-demand compilation)
    actionTimeout: isCI ? 15_000 : 5_000,
  },

  // Raise the default expect() assertion timeout in CI — Next.js dev server
  // may need several seconds to compile pages on first load.
  expect: {
    timeout: isCI ? 10_000 : 5_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  // Spin up the Next.js dev server before the test run starts.
  // reuseExistingServer lets local development skip the cold start.
  webServer: {
    command: "next dev -p 3010",
    url: "http://localhost:3010",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
