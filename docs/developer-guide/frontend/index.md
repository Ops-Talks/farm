# Frontend Developer Guide

This section covers the Next.js frontend of Farm, including its architecture, component structure, and testing.

## Technology Stack

- **Next.js 16** (React 19) -- App Router with standalone output for Docker
- **Shadcn/ui** -- Component library built on Radix UI primitives
- **Tailwind CSS v4** -- Utility-first CSS framework
- **TypeScript** -- Strict mode enabled
- **Socket.IO Client** -- Real-time WebSocket event streaming
- **Vitest + React Testing Library** -- Unit and component tests
- **Lucide React** -- Icon library

## Sections

| Topic | Description |
|-------|-------------|
| [Architecture](architecture.md) | Project structure, routing, API integration, and design decisions |
| [Testing](testing.md) | Vitest setup, writing component tests, and coverage |

## Project Structure

```
web/
  src/
    app/                   # Next.js App Router pages
      (protected)/         # Route group requiring authentication
        catalog/           # Software catalog pages
        deployments/       # Deployment matrix and history
        docs/              # Documentation browser
        observability/     # Health, metrics, and traces
        queues/            # Background queue monitoring
        teams/             # Team management
        layout.tsx         # Protected layout with AuthGuard + AppShell
        page.tsx           # Dashboard
      login/               # Public login page
      layout.tsx           # Root layout (ThemeProvider, Toaster, AuthProvider)
    components/
      auth-guard.tsx       # Route protection with role checks
      layout/app-shell.tsx # Sidebar navigation, breadcrumbs, user menu
      dashboard/           # Dashboard widgets (QuickStats, HealthPanel, etc.)
      ui/                  # Shadcn/ui generated components
    contexts/
      auth-context.tsx     # Authentication state management
    lib/
      api-client.ts        # REST API client with JWT token management
      ws-client.ts         # WebSocket client for real-time events
      utils.ts             # Utility functions (cn helper)
    types/
      api.ts               # Shared TypeScript types and enums
  public/                  # Static assets
  next.config.ts           # Next.js configuration with API proxy rewrites
  vitest.config.ts         # Vitest test configuration
  Dockerfile               # Multi-stage Docker build for standalone output
```

## Quick Start

```bash
# Install frontend dependencies
cd web && npm install

# Start development server
npm run dev

# Or via Makefile
make web-dev

# Run frontend checks
make check-front
```
