/**
 * Playwright helper — register an organizations route mock with the highest
 * LIFO priority so OrgReadyGate always resolves with at least one org.
 *
 * Call this at the END of each spec's mock-helper function (after the catch-all
 * and all other specific routes) so Playwright's LIFO resolution selects this
 * handler over the generic catch-all for api/v1.
 */

import type { Page } from "@playwright/test";
import { MOCK_ORG } from "../global-setup";

export async function setupOrgMock(page: Page): Promise<void> {
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
}
