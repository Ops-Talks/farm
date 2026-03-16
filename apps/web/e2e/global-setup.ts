/**
 * Playwright global setup — runs once before any test file executes.
 *
 * Responsibilities:
 *  1. Attempt to register the E2E test user via the real API (best-effort;
 *     gracefully skips when the backend is not reachable).
 *  2. Synthesise an authenticated browser session by injecting the required
 *     sessionStorage keys directly (no real login round-trip needed here).
 *  3. Persist the session state to `e2e/.auth/user.json` so individual test
 *     files can load it with `test.use({ storageState: AUTH_FILE })` and
 *     start each test as an already-authenticated user.
 *
 * Why sessionStorage injection instead of the login form?
 *  The app stores auth tokens in sessionStorage (see api-client.ts) rather
 *  than cookies.  Playwright's storageState captures sessionStorage values per
 *  origin, so we can seed the values once here and reuse them in every test
 *  that doesn't explicitly test the login flow itself.
 */

import path from "path";
import fs from "fs";
import { chromium, type FullConfig } from "@playwright/test";

export const AUTH_FILE = path.join(__dirname, ".auth/user.json");

// ---------------------------------------------------------------------------
// Mock data – intentionally fake tokens; tests intercept real API calls anyway
// ---------------------------------------------------------------------------

export const MOCK_USER = {
  id: "e2e-user-id",
  username: "e2e-admin",
  roles: ["admin"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const MOCK_TOKENS = {
  token: "e2e-mock-access-token",
  refreshToken: "e2e-mock-refresh-token",
};

// ---------------------------------------------------------------------------

async function globalSetup(config: FullConfig): Promise<void> {
  // 1. Ensure the auth directory exists
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // 2. Attempt to register the E2E user in the real backend.
  //    This is purely opportunistic — tests do not rely on a live backend.
  try {
    const res = await fetch("http://localhost:3000/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "e2e-admin",
        password: "E2ePassword123!",
      }),
    });

    // 201 = created, 409 = conflict (user already exists) — both are fine
    if (!res.ok && res.status !== 409) {
      console.warn(
        `[global-setup] Registration returned HTTP ${res.status} — continuing with mock auth`,
      );
    }
  } catch {
    // Backend not running; tests will mock all API calls instead
    console.warn(
      "[global-setup] Backend API unreachable — proceeding with mock auth state",
    );
  }

  // 3. Launch a headless browser, navigate to the app origin, and inject
  //    the sessionStorage values that the auth context reads on boot.
  const baseURL =
    config.projects[0]?.use?.baseURL ?? "http://localhost:3001";

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Intercept all API calls so the global setup never depends on a live API
  await page.route("**/api/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0 }),
    }),
  );

  // Navigate to the app origin so sessionStorage is scoped correctly
  await page.goto(`${baseURL}/login`);

  // Inject auth tokens and user object into sessionStorage, mirroring exactly
  // what api-client.ts#setTokens() and auth-context.tsx#login() produce.
  await page.evaluate(
    ({ tokens, user }) => {
      sessionStorage.setItem("farm_token", tokens.token);
      sessionStorage.setItem("farm_refresh", tokens.refreshToken);
      sessionStorage.setItem("farm_username", user.username);
      sessionStorage.setItem("farm_user", JSON.stringify(user));
    },
    { tokens: MOCK_TOKENS, user: MOCK_USER },
  );

  // 4. Persist the session (includes sessionStorage) to disk
  await context.storageState({ path: AUTH_FILE });

  await context.close();
  await browser.close();
}

export default globalSetup;
