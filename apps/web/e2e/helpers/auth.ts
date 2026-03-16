/**
 * E2E authentication helpers.
 *
 * `loginAsAdmin` exercises the real login form (useful for auth-flow tests)
 * while mocking the backend API call so the test suite stays self-contained.
 */

import type { Page } from "@playwright/test";
import { MOCK_TOKENS, MOCK_USER } from "../global-setup";

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
 * @example
 * test('dashboard loads after login', async ({ page }) => {
 *   await loginAsAdmin(page);
 *   await expect(page).toHaveURL(/\/dashboard/);
 * });
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  // Intercept the login API call — must be registered BEFORE navigation
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_LOGIN_RESPONSE),
    }),
  );

  // Stub all other API calls that may fire after the redirect to /dashboard
  // so that the page can finish rendering without a live backend.
  await page.route("**/api/v1/**", (route) => {
    // Already handled by the more-specific route above (registered last = higher
    // priority in Playwright's LIFO route resolution), so this catch-all only
    // fires for non-login requests.
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0 }),
    });
  });

  // Navigate, fill, submit
  await page.goto("/login");
  await page.getByLabel("Username").fill("e2e-admin");
  await page.getByLabel("Password").fill("E2ePassword123!");
  await page.getByRole("button", { name: "Sign In" }).click();

  // Confirm successful auth by waiting for the redirect
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}
