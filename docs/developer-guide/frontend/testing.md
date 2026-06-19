# Frontend Testing

This guide covers testing strategies and practices for the Farm frontend.

## Overview

Farm uses **Vitest** as the test runner with **React Testing Library** for component tests and **jsdom** as the browser environment.

## Test Structure

Tests are co-located with the source files they cover under `apps/web/src/`:

```text
apps/web/
  src/
    app/
      login/
        page.test.tsx
      (protected)/
        catalog/
          page.test.tsx
          _components/
            CatalogClient.test.tsx
            ...
        catalog/[id]/
          _components/
            ComponentDetailClient.test.tsx
            IstioTrafficTab.test.tsx
            KyvernoPolicyTab.test.tsx
            ...
        alerting-rules/...
        analytics/...
        compliance/...
        custom-dashboards/...
        dashboard/...
        deployments/...
        environment-requests/...
        environments/...
        incidents/...
        integrations/...
        operators/...
        organizations/...
        pipelines/...
        service-templates/...
        slos/...
        teams/...
    components/
      layout/
        app-shell.test.tsx
        ...
    lib/
      api-client.test.ts
      ws-client.test.ts
    contexts/
      auth-context.test.tsx
  e2e/
    auth.spec.ts
    catalog.spec.ts
    deployments.spec.ts
    docs.spec.ts
    environments.spec.ts
    organizations.spec.ts
    pipelines.spec.ts
    teams.spec.ts
```

## Running Tests

### All Tests

```bash
# Via Makefile (recommended)
make web-test

# Direct npm workspace command
npm run web:test
```

### Watch Mode

```bash
cd apps/web && npx vitest --watch
```

### With Coverage

```bash
cd apps/web && npx vitest --coverage
```

### Full Frontend Check

```bash
make check-front
```

This runs lint, build, tests, and Playwright E2E tests.

## Configuration

The Vitest configuration is in `web/vitest.config.ts`:

- **Environment**: jsdom (simulates browser DOM)
- **Globals**: `describe`, `it`, `expect` available without imports
- **Path aliases**: `@/` maps to `src/` (matching `tsconfig.json`)
- **Setup file**: `src/__tests__/setup.ts` runs before all tests
- **Coverage exclusions**: Shadcn/ui generated components (`components/ui/`)

## Writing Tests

### Test Setup

The global setup file (`src/__tests__/setup.ts`) provides:

- `@testing-library/jest-dom` matchers (e.g., `toBeInTheDocument()`)
- Auto-cleanup after each test
- Mocks for `next/navigation` (`useRouter`, `usePathname`)
- Mocks for `next-themes` (`useTheme`)
- Mocks for `sonner` (`toast`)
- Mock `sessionStorage`

### Testing API Client Functions

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { catalog } from "@/lib/api-client";

describe("catalog API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list components", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [], total: 0 }),
    });

    const result = await catalog.listComponents({ take: 10 });
    expect(result.total).toBe(0);
  });
});
```

### Testing Components with Mocked API

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockListComponents = vi.fn();
vi.mock("@/lib/api-client", () => ({
  catalog: { listComponents: (...args) => mockListComponents(...args) },
}));

import CatalogPage from "@/app/(protected)/catalog/page";

it("should display components in table", async () => {
  mockListComponents.mockResolvedValue({
    data: [{ id: "1", name: "auth-service", kind: "service" }],
    total: 1,
  });

  render(<CatalogPage />);

  await waitFor(() => {
    expect(screen.getByText("auth-service")).toBeInTheDocument();
  });
});
```

### Testing User Interactions

```typescript
import userEvent from "@testing-library/user-event";

it("should filter by search text", async () => {
  const user = userEvent.setup();
  // ... render component with data

  await user.type(screen.getByPlaceholderText("Filter..."), "payment");
  expect(screen.queryByText("auth-service")).not.toBeInTheDocument();
  expect(screen.getByText("payment-api")).toBeInTheDocument();
});
```

### Testing Auth Context

```typescript
import { render, screen, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/contexts/auth-context";

function TestConsumer() {
  const { isAuthenticated, login } = useAuth();
  return <span>{isAuthenticated ? "yes" : "no"}</span>;
}

it("should start unauthenticated", () => {
  render(<AuthProvider><TestConsumer /></AuthProvider>);
  expect(screen.getByText("no")).toBeInTheDocument();
});
```

## Best Practices

### Mock External Dependencies

Always mock API calls, WebSocket connections, and Next.js router at the module level using `vi.mock()`. This keeps tests fast and deterministic.

### Use `waitFor` for Async Rendering

Components that fetch data in `useEffect` need `waitFor` to wait for state updates:

```typescript
await waitFor(() => {
  expect(screen.getByText("expected text")).toBeInTheDocument();
});
```

### Test User-Visible Behavior

Focus on what the user sees and interacts with, not implementation details. Query elements by role, label text, or placeholder text rather than CSS classes or test IDs.

### Test Error States

Always test what happens when API calls fail:

```typescript
it("should show error on API failure", async () => {
  mockApi.mockRejectedValue(new Error("Network error"));
  render(<MyPage />);
  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

### Keep Tests Independent

Each test should work in isolation. Use `beforeEach` with `vi.clearAllMocks()` to reset state between tests.

## Current Coverage

The test suite covers 114+ test files with 1700+ assertions spanning all major feature areas: catalog, authentication, teams, environments, pipelines, SLOs, incidents, alerting rules, analytics, compliance (tag policies, Kyverno), dashboards, service templates, environment requests, Istio, operators (Kubernetes), CI/CD integrations, and the API client layer. Run `make web-test` to see the current count.

## End-to-End Tests (Playwright)

Farm uses **Playwright** for browser-level E2E tests that validate full user journeys without a live backend. All API calls are intercepted with `page.route()`.

### Location

```text
apps/web/
  e2e/
    helpers/
      setup-auth-storage.ts    # Seeds sessionStorage tokens via addInitScript
    global-setup.ts            # MOCK_USER, MOCK_TOKENS, AUTH_FILE constants
    auth.spec.ts               # Login, logout, token refresh flows
    catalog.spec.ts            # Component list, create, detail flows
    deployments.spec.ts        # Deployment list and matrix
    teams.spec.ts              # Team CRUD and member management
    environments.spec.ts       # Helm releases, ArgoCD, Rollout dashboard
    organizations.spec.ts      # Org list, create, member management
    pipelines.spec.ts          # Pipeline list, create, runs, trigger
    docs.spec.ts               # Doc tree, content rendering, search
```

### Running E2E Tests

```bash
# All E2E specs (headless)
cd apps/web && npx playwright test

# Single spec
cd apps/web && npx playwright test e2e/environments.spec.ts

# Headed (with browser UI)
cd apps/web && npx playwright test --headed

# UI mode (interactive)
cd apps/web && npx playwright test --ui
```

### Auth Pattern

All authenticated tests use `setupAuthStorage` to inject fake JWT tokens into `sessionStorage` before the page loads:

```typescript
import { setupAuthStorage } from "./helpers/setup-auth-storage";

test.beforeEach(async ({ page }) => {
  await setupAuthStorage(page);
});
```

`setupAuthStorage` uses `page.addInitScript()` so the tokens are available on the very first render, before any React hydration.

### Route Mocking Pattern

Playwright resolves route interceptors in **LIFO order** (last registered wins). Always register the catch-all first:

```typescript
// 1. Catch-all — registered first, lowest priority
await page.route("**/api/v1/**", (route) =>
  route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
);

// 2. Specific routes — registered last, highest priority
await page.route("**/api/v1/catalog/components**", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: [MOCK_COMPONENT], total: 1 }),
  })
);
```

### Unauthenticated Tests

Isolate unauthenticated redirect tests in a separate `test.describe` block with cleared storage:

```typescript
test.describe("Page — unauthenticated access", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects to /login", async ({ page }) => {
    await page.route("**/socket.io/**", (route) => route.abort());
    await page.goto("/protected-page");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
```

### E2E Coverage

| Spec | Tests | Flows covered |
|------|-------|---------------|
| `auth.spec.ts` | 5 | Login, invalid credentials, refresh, logout, redirect |
| `catalog.spec.ts` | 5 | List, create, detail, YAML registration |
| `deployments.spec.ts` | 4 | List, matrix view |
| `teams.spec.ts` | 4 | List, create, detail, member management |
| `environments.spec.ts` | 9 | Helm releases, Rollouts, ArgoCD apps, sync actions |
| `organizations.spec.ts` | 10 | List, create, settings, member add/remove |
| `pipelines.spec.ts` | 10 | List, create, detail, runs tab, trigger |
| `docs.spec.ts` | 9 | Tree navigation, content rendering, search, create form |
| **Total** | **56** | |


