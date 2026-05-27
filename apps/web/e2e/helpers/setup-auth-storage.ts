/**
 * Playwright helper — mock the auth profile endpoint and org list before a
 * page navigates, so the app's AuthProvider restores the session correctly.
 *
 * Route registration order (LIFO priority note):
 * Playwright resolves page.route() handlers in LIFO (last-registered-first)
 * order. setupAuthStorage is called in test.beforeEach, so its handlers have
 * LOWER priority than any route a test body registers afterward.
 *
 * To ensure GET /auth/profile reaches this helper's mock even when a test
 * body registers a catch-all like "*​*​/api/v1/**", every such catch-all must
 * call route.fallback() for URLs that include "/api/v1/auth/". That allows
 * the request to fall through to the profile mock registered here.
 *
 * Usage: call this in test.beforeEach BEFORE any page.goto() call.
 */

import type { Page } from "@playwright/test";
import { MOCK_USER, MOCK_ORG } from "../global-setup";

export async function setupAuthStorage(page: Page): Promise<void> {
  // Suppress Socket.IO polling so the WS client does not fire connection
  // errors while the backend is not running during E2E tests.
  await page.route("**/socket.io/**", (route) => route.abort());

  // Seed current-org in sessionStorage so api-client.ts can read it when
  // building the X-Organization-Id request header.
  await page.addInitScript(
    ({ orgId }: { orgId: string }) => {
      sessionStorage.setItem("farm_current_org", orgId);
    },
    { orgId: MOCK_ORG.id },
  );

  // Mock GET /auth/profile — AuthProvider.restoreSession() calls this on
  // mount to validate the httpOnly session cookie and restore the user.
  // Catch-all handlers registered by test bodies must call route.fallback()
  // for auth-scoped URLs so the request falls through to this mock.
  await page.route("**/api/v1/auth/profile", (route) => {
    if (route.request().method() === "GET") {
      void route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_USER),
      });
    } else {
      void route.continue();
    }
  });

  // Mock POST /auth/logout — ensures logout calls complete cleanly without
  // hitting the real API server during E2E tests.
  await page.route("**/api/v1/auth/logout", (route) => {
    if (route.request().method() === "POST") {
      void route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Logged out" }),
      });
    } else {
      void route.continue();
    }
  });

  // Intercept the organizations list so OrgReadyGate resolves with at least
  // one org and does not redirect to /organizations/new.
  // Individual spec files can register more-specific routes that override
  // this catch-all (Playwright resolves routes in LIFO order).
  await page.route("**/api/v1/organizations", (route) => {
    if (route.request().method() === "GET") {
      void route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [MOCK_ORG], total: 1 }),
      });
    } else {
      void route.continue();
    }
  });
}
