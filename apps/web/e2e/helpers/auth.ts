/**
 * E2E authentication helpers.
 *
 * `loginAsAdmin` exercises the real login form (useful for auth-flow tests)
 * while mocking the backend API call so the test suite stays self-contained.
 */

import type { Page } from "@playwright/test";
import { MOCK_TOKENS, MOCK_USER, MOCK_ORG } from "../global-setup";

// ---------------------------------------------------------------------------
// Mock login response that mirrors the shape of LoginResponse from @farm/types
// ---------------------------------------------------------------------------
const MOCK_LOGIN_RESPONSE = {
  token: MOCK_TOKENS.token,
  refreshToken: MOCK_TOKENS.refreshToken,
  user: MOCK_USER,
};

/**
 * Navigates to `/login`, fills the credential form, and waits for the
 * redirect to `/dashboard`.
 *
 * The backend `POST /api/v1/auth/login` call is intercepted and answered
 * with a synthetic success response so the test never depends on a live API.
 *
 * An organizations mock is also registered so `OrgReadyGate` resolves
 * immediately after login without redirecting to /organizations/new.
 *
 * @example
 * test('dashboard loads after login', async ({ page }) => {
 *   await loginAsAdmin(page);
 *   await expect(page).toHaveURL(/\/dashboard/);
 * });
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  // Catch-all registered FIRST so the specific routes (registered after)
  // take priority in Playwright's LIFO route resolution. This catch-all
  // handles non-login requests (e.g., dashboard API calls after redirect).
  await page.route("**/api/v1/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0 }),
    });
  });

  // Intercept the login API call (registered last = highest priority)
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_LOGIN_RESPONSE),
    }),
  );

  // Ensure OrgReadyGate resolves after the post-login redirect so protected
  // pages are not blocked indefinitely waiting for at least one org.
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

  // Navigate, fill, submit
  await page.goto("/login");
  await page.getByLabel("Username").fill("e2e-admin");
  await page.getByLabel("Password").fill("E2ePassword123!");
  await page.getByRole("button", { name: "Sign In" }).click();

  // Confirm successful auth by waiting for the redirect
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}
