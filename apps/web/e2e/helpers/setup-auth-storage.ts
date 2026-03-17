/**
 * Playwright helper — inject mock auth tokens into sessionStorage before the
 * page boots.
 *
 * Why addInitScript instead of storageState?
 *
 * Playwright's storageState format captures and restores localStorage and
 * cookies, but sessionStorage is per-tab and is NOT restored by
 * `test.use({ storageState })`. The Next.js auth context reads tokens from
 * sessionStorage inside a React useState initializer that runs during the
 * first client-side render. If the tokens are not present at that moment,
 * the user is treated as unauthenticated and AuthGuard redirects to /login.
 *
 * `page.addInitScript()` registers a script that executes before any of the
 * page's own scripts, so sessionStorage is populated before React hydrates
 * and the useState initializer fires.
 *
 * Usage: call this in test.beforeEach BEFORE any page.goto() call.
 */

import type { Page } from "@playwright/test";
import { MOCK_USER, MOCK_TOKENS } from "../global-setup";

export async function setupAuthStorage(page: Page): Promise<void> {
  // Suppress Socket.IO polling so the WS client does not fire connection
  // errors while the backend is not running during E2E tests.
  await page.route("**/socket.io/**", (route) => route.abort());

  // Intercept the organizations list so OrgSwitcher never hits the proxy.
  // Individual spec files can register more-specific routes that override
  // this catch-all (Playwright resolves routes in LIFO order).
  await page.route("**/api/v1/organizations", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    } else {
      void route.continue();
    }
  });

  await page.addInitScript(
    ({ user, tokens }) => {
      sessionStorage.setItem("farm_token", tokens.token);
      sessionStorage.setItem("farm_refresh", tokens.refreshToken);
      sessionStorage.setItem("farm_username", user.username);
      sessionStorage.setItem("farm_user", JSON.stringify(user));
    },
    { user: MOCK_USER, tokens: MOCK_TOKENS },
  );
}
