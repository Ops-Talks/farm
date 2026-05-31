# Farm Web

Next.js 16 frontend for Farm. Provides the UI for software component catalog,
documentation, environments, teams, and CI/CD pipeline management.

## Quick Start

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to access
the web interface. The application automatically connects to the API at
`http://localhost:3000/api` by default.

Changes to `app/` and `src/` are reflected immediately in the browser.

## Build

Compile the Next.js application for production:

```bash
npm run build
npm start
```

## Testing

Run the test suite:

```bash
npm run test
```

Run Playwright integration tests:

```bash
npm run test:e2e
```

## Environment Variables

The web application is configured via the following environment variables
(see `.env.local` for development):

- `NEXT_PUBLIC_API_URL` - Public API base URL (browser requests)
- `API_INTERNAL_URL` - Internal API URL for server-side proxying (e.g.,
  `http://farm-api:3000` in Kubernetes)

In development, both default to `http://localhost:3000/api` if not set.

## Deployment

The web application is deployed as a Docker container and managed by the Farm
Helm chart. See [`deploy/helm/farm/README.md`](../../deploy/helm/farm/README.md)
for Kubernetes deployment instructions.
