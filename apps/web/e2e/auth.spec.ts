/**
 * E2E — Authentication flows
 *
 * Tests in this file exercise the login page and auth-guard behaviour.
 * All backend API calls are intercepted with page.route() so no live
 * NestJS server is required.
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";
import { MOCK_USER, MOCK_TOKENS, MOCK_ORG } from "./global-setup";

// ── Shared mock data ────────────────────────────────────────────────────────

const MOCK_LOGIN_RESPONSE = {
  token: MOCK_TOKENS.token,
  refreshToken: MOCK_TOKENS.refreshToken,
  user: MOCK_USER,
};

// ---------------------------------------------------------------------------
// Every test in this file should start unauthenticated — we explicitly clear
// the storage state so pre-saved auth (from global-setup) is not loaded.
// ---------------------------------------------------------------------------
test.use({ storageState: { cookies: [], origins: [] } });

// ── Test: successful login ──────────────────────────────────────────────────

test("user can log in with valid credentials and is redirected to dashboard", async ({
  page,
}) => {
  // Stub any dashboard API calls that fire after redirect — registered FIRST
  // so the specific login route (registered after) has higher LIFO priority.
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0 }),
    }),
  );

  // Stub endpoints that require a specific shape to avoid render crashes.
  await page.route("**/api/v1/setup/checklist", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }),
  );
  await page.route("**/api/v1/features/availability", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        kubernetes: false,
        cost: false,
        registry: false,
        helm: false,
        istio: false,
        linkerd: false,
        allConfigured: false,
      }),
    }),
  );
  // health.check() calls GET /api/health (no version prefix) — must include
  // `details` or HealthPanel throws during Object.entries(healthData.details).
  await page.route("**/api/health", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok", details: {} }),
    }),
  );

  // Intercept the login endpoint with a success response (registered last = highest priority)
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_LOGIN_RESPONSE),
    }),
  );

  // Ensure OrgReadyGate resolves after redirect so /dashboard is not blocked.
  await page.route("**/api/v1/organizations", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [MOCK_ORG], total: 1 }),
      });
    } else {
      void route.continue();
    }
  });

  await page.goto("/login");

  // CardTitle renders as a <div>, not a semantic heading — use text matcher
  await expect(page.getByText("Farm").first()).toBeVisible();
  await expect(page.getByLabel("Username")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();

  // Fill credentials and submit
  await page.getByLabel("Username").fill("e2e-admin");
  await page.getByLabel("Password").fill("E2ePassword123!");
  await page.getByRole("button", { name: "Sign In" }).click();

  // Should redirect to /dashboard after successful login
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

// ── Test: invalid credentials ───────────────────────────────────────────────

test("login page shows an error message with invalid credentials", async ({
  page,
}) => {
  // Return a 401 Unauthorized response to simulate bad credentials
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        statusCode: 401,
        message: "Invalid credentials",
        timestamp: new Date().toISOString(),
        path: "/api/v1/auth/login",
      }),
    }),
  );

  await page.goto("/login");
  await page.getByLabel("Username").fill("wrong-user");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign In" }).click();

  // The login page should stay visible and display an error
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("Invalid credentials")).toBeVisible();
});

// ── Test: unauthenticated redirect ─────────────────────────────────────────

test("protected routes redirect unauthenticated users to /login", async ({
  page,
}) => {
  // Navigate directly to a protected route without any auth state
  await page.goto("/dashboard");

  // The AuthGuard detects no token in sessionStorage and calls router.replace
  await expect(page).toHaveURL(/\/login/);
});

test("catalog redirects unauthenticated users to /login", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page).toHaveURL(/\/login/);
});

// ── Test: loginAsAdmin helper ───────────────────────────────────────────────

test("loginAsAdmin helper successfully authenticates and lands on dashboard", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await expect(page).toHaveURL(/\/dashboard/);
});
