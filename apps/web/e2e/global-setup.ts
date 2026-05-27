/**
 * Playwright global setup — runs once before any test file executes.
 *
 * Responsibilities:
 *  1. Attempt to register the E2E test user via the real API (best-effort;
 *     gracefully skips when the backend is not reachable).
 *  2. Synthesise a minimal browser session state — auth tokens now live in
 *     httpOnly cookies set by the server, so only non-sensitive session keys
 *     (e.g. farm_current_org) are injected here.  Authenticated state is
 *     restored by mocking the GET /api/v1/auth/profile endpoint in each test
 *     via setupAuthStorage().
 *  3. Persist the session state to `e2e/.auth/user.json` so individual test
 *     files can load it with `test.use({ storageState: AUTH_FILE })`.
 *
 * Why no sessionStorage token injection?
 *  Tokens are now stored in httpOnly; Secure; SameSite=Lax cookies (FARM-S598).
 *  Playwright cannot set httpOnly cookies through the storageState file.
 *  Each test that needs an authenticated session must instead mock the profile
 *  endpoint via setupAuthStorage() so AuthProvider.restoreSession() succeeds.
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

/** Default organization used by all e2e tests that do not define their own. */
export const MOCK_ORG = {
  id: "org-e2e-global-001",
  name: "E2E Global Org",
  slug: "e2e-global-org",
  description: "Default organization injected by global-setup for e2e tests",
  ownerId: "e2e-user-id",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
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

  // 3. Write the auth state file.
  //
  //    Tokens are now in httpOnly cookies — they cannot be seeded through this
  //    file.  We only persist non-sensitive session values that are stored in
  //    sessionStorage and are still read by the client (e.g. farm_current_org
  //    for the active organization header).  Each individual test that needs
  //    an authenticated session mocks GET /api/v1/auth/profile via
  //    setupAuthStorage() so AuthProvider.restoreSession() succeeds.
  const baseURL =
    config.projects[0]?.use?.baseURL ?? "http://localhost:3010";

  const authState = {
    cookies: [],
    origins: [
      {
        origin: baseURL,
        localStorage: [],
        sessionStorage: [
          { name: "farm_current_org", value: MOCK_ORG.id },
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
