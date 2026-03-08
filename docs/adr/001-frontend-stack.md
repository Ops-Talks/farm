# ADR-001: Front-End Technology Stack

## Status

Accepted

## Date

2026-03-08

## Context

Farm is an open-source developer portal (similar to Backstage) that needs a front-end
application to provide a user interface for its features: software catalog, deployment
matrix, job queue monitoring, health dashboards, and real-time event feeds.

The front-end must support:

- Data-heavy views (tables with sorting, filtering, pagination)
- Real-time updates via Socket.IO WebSocket integration
- JWT-based authentication with token refresh
- Dark mode and theming
- TypeScript strict mode
- Strong testing ecosystem

## Decision

### Framework: Next.js 15 (React 19)

Next.js with the App Router was selected as the front-end framework.

**Rationale:**

- **Ecosystem**: React has the largest component and library ecosystem, critical for a
  data-heavy dashboard application.
- **SSR/SSG**: Next.js provides server-side rendering and static generation for
  performance-critical pages (e.g., health status).
- **TypeScript**: First-class TypeScript support with strict mode.
- **Backstage alignment**: Backstage itself is built with React, making this a natural
  choice for a similar developer portal.
- **Socket.IO**: The `socket.io-client` package has excellent React integration via hooks.
- **Testing**: React Testing Library and Jest provide a mature testing stack.

**Alternatives considered:**

- **Vue 3 + Vite**: Strong DX and Vuetify for data tables, but smaller ecosystem for
  developer portal-specific components.
- **SvelteKit**: Excellent performance and DX, but the ecosystem for complex data tables
  and enterprise UI components is still maturing.
- **Angular**: Enterprise-grade features built in, but heavier learning curve and bundle
  size for a portal that benefits from lightweight page loads.

### UI Component Library: Shadcn/ui + Tailwind CSS

Shadcn/ui was selected as the component library, built on Radix UI primitives with
Tailwind CSS for styling.

**Rationale:**

- **Ownership**: Components are copied into the project (not a dependency), giving full
  control over customization.
- **Accessibility**: Built on Radix UI headless primitives with full WAI-ARIA compliance.
- **Data tables**: Integrates with TanStack Table for powerful, type-safe data tables.
- **Dark mode**: Built-in dark mode support via CSS variables.
- **Tailwind CSS**: Utility-first CSS framework that eliminates style conflicts and
  enables rapid UI development.
- **Growing adoption**: Widely used in the Next.js ecosystem.

**Alternatives considered:**

- **MUI (Material UI)**: Comprehensive but opinionated styling, large bundle size.
- **Chakra UI**: Good DX but less flexible for custom designs.
- **Radix UI + custom CSS**: More work to style from scratch without Shadcn presets.

### Project Structure

The front-end lives in `web/` at the repository root rather than a full `apps/api/` +
`apps/web/` monorepo restructure. This avoids breaking the existing backend build
pipeline, Docker configuration, and CI/CD while keeping the codebase in a single
repository.

```
farm/
├── src/              # NestJS backend (unchanged)
├── web/              # Next.js front-end
│   ├── src/
│   │   ├── app/      # Next.js App Router pages
│   │   ├── components/
│   │   ├── lib/      # API client, WebSocket, utilities
│   │   └── types/    # Shared TypeScript types
│   ├── public/
│   ├── next.config.ts
│   └── package.json
├── package.json      # Backend package.json (unchanged)
└── docker-compose.yml
```

### API Integration

API types are generated from the backend OpenAPI spec using `openapi-typescript` for
type safety. The API client uses the native `fetch` API with interceptors for JWT
token injection and automatic token refresh on 401 responses.

## Consequences

- **Positive**: Full control over UI components, strong TypeScript integration, mature
  testing ecosystem, and alignment with the Backstage developer portal pattern.
- **Positive**: No disruption to the existing backend build pipeline or Docker setup.
- **Negative**: Two separate `package.json` files (root for backend, `web/` for frontend)
  require independent dependency management.
- **Negative**: Shared types must be generated from OpenAPI rather than imported directly,
  adding a generation step to the workflow.
