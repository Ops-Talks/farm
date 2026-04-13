# Frontend Architecture

This document describes the architecture of the Farm frontend, including design decisions, component patterns, and API integration.

## Design Decisions

### Framework: Next.js 16 (React 19)

Next.js with the App Router was selected as the frontend framework.

**Rationale:**

- **Ecosystem**: React has the largest component and library ecosystem, critical for a data-heavy dashboard application.
- **SSR/SSG**: Next.js provides server-side rendering and static generation for performance-critical pages.
- **TypeScript**: First-class TypeScript support with strict mode.
- **Backstage alignment**: Backstage itself is built with React, making this a natural choice for a similar developer portal.
- **Socket.IO**: The `socket.io-client` package has excellent React integration via hooks.
- **Testing**: React Testing Library and Vitest provide a mature testing stack.

**Alternatives considered:**

- **Vue 3 + Vite**: Strong DX and Vuetify for data tables, but smaller ecosystem for developer portal-specific components.
- **SvelteKit**: Excellent performance and DX, but the ecosystem for complex data tables and enterprise UI components is still maturing.
- **Angular**: Enterprise-grade features built in, but heavier learning curve and bundle size for a portal that benefits from lightweight page loads.

### UI Component Library: Shadcn/ui + Tailwind CSS

Shadcn/ui was selected as the component library, built on Radix UI primitives with Tailwind CSS for styling.

**Rationale:**

- **Ownership**: Components are copied into the project (not a dependency), giving full control over customization.
- **Accessibility**: Built on Radix UI headless primitives with full WAI-ARIA compliance.
- **Data tables**: Integrates with TanStack Table for powerful, type-safe data tables.
- **Dark mode**: Built-in dark mode support via CSS variables.
- **Tailwind CSS**: Utility-first CSS framework that eliminates style conflicts and enables rapid UI development.
- **Growing adoption**: Widely used in the Next.js ecosystem.

**Alternatives considered:**

- **MUI (Material UI)**: Comprehensive but opinionated styling, large bundle size.
- **Chakra UI**: Good DX but less flexible for custom designs.
- **Radix UI + custom CSS**: More work to style from scratch without Shadcn presets.

### Monorepo Layout

The frontend lives in `apps/web/` within the monorepo alongside the NestJS backend at `apps/api/`. Both applications share the repository root for common configuration, Docker orchestration, and CI/CD workflows.

## Application Architecture

### Routing

Farm uses the Next.js App Router with route groups:

- **`(protected)/`** -- All authenticated pages wrapped in `AuthGuard` and `AppShell`
- **`login/`** -- Public login page (no authentication required)

Each route segment can have its own `page.tsx`, `loading.tsx`, and `error.tsx` files.

### Authentication Flow

```
Login Page
    |
    v
AuthContext.login(username, password)
    |
    v
api-client.auth.login({ username, password })
    |
    v
Store tokens in sessionStorage (farm_token, farm_refresh, farm_user)
    |
    v
Router.push("/dashboard")
    |
    v
AuthGuard checks isAuthenticated
    |-- Yes -> Render children
    |-- No  -> Redirect to /login
```

Key components:

| Component | Responsibility |
|-----------|----------------|
| `AuthProvider` | Manages user state, login/logout, session restoration |
| `AuthGuard` | Protects routes, checks roles, redirects unauthenticated users |
| `api-client` | Stores JWT tokens, auto-refreshes on 401 responses |

### API Integration

The API client (`apps/web/src/lib/api-client.ts`) provides a typed interface to the NestJS backend:

- **Base URL**: Uses relative `/api` path (proxied by Next.js rewrites to the backend)
- **Token management**: JWT access token and refresh token stored in `sessionStorage`
- **Auto-refresh**: On 401 responses, automatically attempts token refresh before retrying
- **Namespaced methods**: `auth.*`, `catalog.*`, `deployments.*`, `environments.*`, `teams.*`, `queues.*`, `docs.*`, `health.*`, `organizations.*`, `invitations.*`, `observability.*`, `pipelines.*`, `alertingRules.*`, `plugins.*`, `analytics.*`, `helm.*`, `kubernetes.*`, `integrations.*`, `argocd.*`, `circleci.*`, `jenkins.*`, `travisci.*`, `cloud.*`, `tagPolicies.*`, `kyverno.*`, `istio.*`, `linkerd.*`, `opa.*`, `registry.*`, `finops.*`, `search.*`, `features.*`, `setup.*`, `keycloakCredentials.*`, `apiSpecs.*`, `gateway.*`, `slos.*`, `incidents.*`, `postMortems.*`, `dashboards.*`, `serviceTemplates.*`, `environmentRequests.*`

#### Docker Proxy Configuration

In Docker, Next.js rewrites proxy `/api/*` requests to the internal API container:

```typescript
// next.config.ts
rewrites: async () => ({
  fallback: [
    {
      source: "/api/:path*",
      destination: `${API_INTERNAL_URL}/:path*`,  // http://api:3000/api/:path*
    },
  ],
})
```

The `API_INTERNAL_URL` is a build-time argument in the Dockerfile since Next.js standalone mode bakes rewrites at build time.

### WebSocket Integration

The WebSocket client (`apps/web/src/lib/ws-client.ts`) connects to the backend Socket.IO `/events` namespace:

- **Auto-reconnection**: Infinite reconnection attempts with exponential backoff
- **JWT authentication**: Passes the access token in the `auth.token` handshake field
- **Event subscription**: Components subscribe to specific `FarmEvent` types and receive typed payloads
- **Listener management**: Maintains a global listener map for re-registration on reconnection

### Component Patterns

#### Server vs Client Components

All page and layout components use the `"use client"` directive because they require interactivity (state, effects, event handlers). Future optimization could extract static sections into Server Components.

#### Dashboard Widgets

The dashboard uses independent widget components that fetch their own data:

| Widget | Data Source | Refresh |
|--------|-------------|---------|
| `QuickStats` | Catalog, Teams, Environments, Deployments APIs | 60s interval |
| `HealthPanel` | Health API | 30s interval |
| `ActivityFeed` | WebSocket events | Real-time |
| `QueuePanel` | Static display | -- |

#### Theming

Farm uses `next-themes` with three modes: light, dark, and system. The theme toggle cycles through all three modes and is accessible from the sidebar header.

## Environment Variables

| Variable | Build/Runtime | Description |
|----------|---------------|-------------|
| `NEXT_PUBLIC_API_URL` | Build | Public API URL (fallback for rewrites) |
| `API_INTERNAL_URL` | Build | Internal Docker API URL for rewrites |
| `NEXT_PUBLIC_WS_URL` | Runtime | WebSocket server URL |

## Consequences of Design Choices

- **Positive**: Full control over UI components, strong TypeScript integration, mature testing ecosystem, and alignment with the Backstage developer portal pattern.
- **Positive**: No disruption to the existing backend build pipeline or Docker setup.
- **Negative**: Two separate `package.json` files (root for backend, `web/` for frontend) require independent dependency management.
- **Negative**: All pages are client-rendered; future optimization to leverage Server Components for data-fetching pages is possible.
