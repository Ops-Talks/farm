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
import { type FullConfig } from "@playwright/test";

export const AUTH_FILE = path.join(__dirname, ".auth/user.json");

// ---------------------------------------------------------------------------
// Mock data – intentionally fake tokens; tests intercept real API calls anyway
// ---------------------------------------------------------------------------

export const MOCK_USER = {
  id: "e2e-user-id",
  username: "e2e-admin",
  email: "e2e-admin@example.com",
  displayName: "E2E Admin",
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

  // 3. Write the auth state file directly.
  //
  //    Playwright's storageState() only captures localStorage — sessionStorage
  //    is tab-scoped and intentionally excluded from the format.  Since the app
  //    stores auth tokens in sessionStorage, we build the state file by hand so
  //    that Playwright's storageState loader can restore the right values via
  //    addInitScript before the page boots.
  const baseURL =
    config.projects[0]?.use?.baseURL ?? "http://localhost:3010";

  const authState = {
    cookies: [],
    origins: [
      {
        origin: baseURL,
        localStorage: [],
        sessionStorage: [
          { name: "farm_token", value: MOCK_TOKENS.token },
          { name: "farm_refresh", value: MOCK_TOKENS.refreshToken },
          { name: "farm_username", value: MOCK_USER.username },
          { name: "farm_user", value: JSON.stringify(MOCK_USER) },
        ],
      },
    ],
  };

  fs.writeFileSync(AUTH_FILE, JSON.stringify(authState, null, 2));

  // 4. Pre-warm key pages so Next.js compiles them before tests begin.
  //    The dev server compiles routes on first request; without this the first
  //    test to visit a page may time out waiting for on-demand compilation in CI.
  const pagesToWarm = ["/login", "/dashboard"];
  for (const route of pagesToWarm) {
    try {
      await fetch(`${baseURL}${route}`);
    } catch {
      // Non-fatal — tests will still run; they just may be slower on first visit.
    }
  }
}

export default globalSetup;
