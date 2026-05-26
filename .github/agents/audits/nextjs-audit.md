# Next.js 16 Frontend Audit — `apps/web/`

**Auditor**: Farm-Developer-Nextjs agent
**Date**: 2025
**Scope**: `apps/web/` against Next.js 16 official docs and modern React patterns
**Stack confirmed**: `next@^16.2.6`, `react@^19.2.5`, App Router, Turbopack default, TypeScript strict, NestJS API backend, monorepo with `outputFileTracingRoot`, standalone output.

---

## Executive Summary — Top 5 Critical Issues

| # | Issue | Why it matters |
|---|---|---|
| **C1** | **Server Components are used as inert wrappers everywhere.** Every page (including dynamic routes such as `catalog/[id]`, `teams/[id]`, `incidents/[id]`) renders a single `<*Client />` child. All data is fetched in the browser via `react-query` → `api-client` → `/api/v1/*`. There is **zero server-rendered data**, no streaming, no `use cache`, no PPR, no `generateMetadata({ params }) → fetch(...)` pattern. The RSC architecture is structurally bypassed. | Eliminates Next.js 16's flagship benefits: instant navigation, PPR, streaming, smaller client bundles, SEO, and the `updateTag()` / `revalidateTag()` / `refresh()` cache APIs. Forces 100% of network round-trips through the browser after hydration. |
| **C2** | **JWT access + refresh tokens stored in `sessionStorage`** (`api-client.ts:208–217`), readable by any script. Combined with CSP `'unsafe-inline' 'unsafe-eval'` in Report-Only mode, **any reflected/stored XSS = full session takeover**. | Token theft is trivial under XSS; httpOnly+Secure+SameSite cookies are the standard. The current model is the dominant cause of why C1 is "locked in" (server cannot read tokens to fetch on behalf of the user). |
| **C3** | **CSP is `Content-Security-Policy-Report-Only`** with `'unsafe-inline' 'unsafe-eval' 'self'` in `script-src` and no nonces (`next.config.ts:21–32`). HSTS, XFO, COOP, etc. are set, but the most important header is non-enforcing. | Report-only CSP provides telemetry, not protection. With no nonces and `'unsafe-inline'` allowed, even enforcement would block almost no XSS payloads. |
| **C4** | **Unsanitised server-supplied HTML rendered with `dangerouslySetInnerHTML`** in `DocsClient.tsx:423` (renders `getRendered(selectedId)` markdown HTML directly). The render highlight helper in `advanced-search-modal.tsx` is a hand-rolled regex tag stripper (not a real sanitizer). | XSS surface: any compromise/misconfig of the docs build pipeline (which renders user-authored markdown server-side) is a stored XSS in the portal. The custom regex stripper in advanced-search has known bypasses for malformed/nested tags despite the loop. |
| **C5** | **`src/proxy.ts` is brand-new and untested.** No unit test, no e2e test, no fixture for the rewrite contract. URL is concatenated with naive string interpolation (`${apiBase}${subPath}${search}`), `new URL(...)` can throw and is uncaught, the matcher does not include trailing-slash semantics, and the build-time fallback to `NEXT_PUBLIC_API_URL` can silently swap a build-time-baked value into a server-runtime proxy (defeats the entire purpose of moving the rewrite out of `next.config.ts`). | The proxy carries 100% of authenticated API traffic. A regression here breaks every page. |

---

## Detailed Findings

| # | Sev | Category | File:Line | Issue | Recommendation | Effort |
|---|---|---|---|---|---|---|
| 1 | **Critical** | RSC architecture | `src/app/**/page.tsx` (≈70 pages) | Pages are 3-line shims around `*Client.tsx`. No `await fetch(...)`, no `generateMetadata({ params })`, no Suspense streaming of server data, no `use cache`. The app is effectively a CSR SPA wrapped in App Router. | Migrate the highest-traffic pages (`dashboard`, `catalog`, `catalog/[id]`, `teams`, `pipelines`) to fetch initial data server-side and hydrate React Query with `dehydrate()` / `HydrationBoundary`. Add `generateMetadata` to detail pages. Adopt `use cache` for read-mostly listings (catalog, scorecards, plugins/registry). | **L** |
| 2 | **Critical** | Security / Auth | `src/lib/api-client.ts:174–217, 304–319` | JWT access + refresh + username stored in `sessionStorage`. Refresh token kept in a regular variable + sessionStorage — fully readable by `document.scripts`. | Move to httpOnly, Secure, SameSite=Lax cookies set by the API or by the proxy on `/api/v1/auth/login` and refreshed via `/api/v1/auth/refresh`. Convert `proxy.ts` into a BFF that injects `Authorization` from the cookie before forwarding. This also unlocks RSC data-fetching (server can read the cookie). | **L** |
| 3 | **Critical** | Security / CSP | `next.config.ts:8–32, 41–48` | CSP is **Report-Only**; `script-src` allows `'unsafe-inline' 'unsafe-eval'`; `connect-src` allows `http://localhost:* https://*` (wildcard https in production!); no nonces. | (a) Switch header key to `Content-Security-Policy` once nonces work; (b) implement per-request nonce in `proxy.ts` (`NextResponse.rewrite()` + `request.headers.set('x-nonce', nonce)`) and read it in `app/layout.tsx`; (c) drop `'unsafe-inline' 'unsafe-eval'` in production; (d) tighten `connect-src` to the API origin + WS only. See Next.js docs on [CSP with nonces](https://nextjs.org/docs/app/guides/content-security-policy). | **M** |
| 4 | **Critical** | XSS | `src/app/(protected)/docs/_components/DocsClient.tsx:106, 423` | `renderedHtml` (server-rendered markdown HTML from API) injected via `dangerouslySetInnerHTML` with **no client-side sanitisation**. The API trust boundary is not enforced in the browser. | Add `isomorphic-dompurify` and run all HTML through it before injection, **or** switch to `react-markdown` + `rehype-sanitize` and let the docs API return raw markdown. | **S** |
| 5 | **Critical** | XSS | `src/components/search/advanced-search-modal.tsx:24–39, 354–365` | Hand-rolled HTML sanitiser using regex tag-stripping. While there's a fixed-point loop, regex-based HTML sanitisation is a known anti-pattern; double-encoding, CDATA, attribute injection, and SVG namespaces all evade it. | Pass highlight fragments through DOMPurify with an allow-list of `strong` only, OR escape both the highlight and fallback into text, then re-emit `<strong>` programmatically via React `<>{parts.map(...)}</>`. | **S** |
| 6 | **Critical** | Proxy / Untested | `src/proxy.ts` | No tests, no error handling around `new URL(...)`, no validation that the rewrite target host matches an allow-list, no logging. | Add a `proxy.test.ts` with `NextRequest` fixtures covering: matcher hit/miss, query string preservation, URL build errors, env var fallback ordering. Wrap construction in try/catch and return 502 on malformed config. Add upstream-host allow-list to prevent SSRF if env vars are misconfigured. | **M** |
| 7 | **High** | Proxy / Env baking | `src/proxy.ts:9–13` | The fallback chain `API_INTERNAL_URL ?? NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api'` lets `NEXT_PUBLIC_API_URL` (build-time inlined into client bundles) silently flow into a server-runtime context, defeating the documented "runtime-injectable upstream" goal. | Remove the `NEXT_PUBLIC_API_URL` fallback inside `proxy.ts`. Crash hard at boot if `API_INTERNAL_URL` is unset in production (`if (process.env.NODE_ENV === 'production' && !process.env.API_INTERNAL_URL) throw`). | **S** |
| 8 | **High** | Caching | All `app/**` | **No `use cache` directive used anywhere** in the codebase (`grep "use cache"` returns 0). No `fetch(url, { next: { revalidate, tags } })`, no `revalidateTag`, no `unstable_cache`. | Adopt Cache Components for listing pages (catalog, plugins/registry, service-templates). Use `next/cache#revalidateTag` from Server Actions on mutation. See [Next.js docs — Cache Components](https://nextjs.org/docs/app/api-reference/directives/use-cache) and [Caching guide](https://nextjs.org/docs/app/guides/caching). | **L** |
| 9 | **High** | Server Actions | All forms | **No Server Actions in the project** (`grep '"use server"'` returns 0). Every form uses `onSubmit` → fetch via `api-client`. Means no progressive enhancement, no `useActionState`, no automatic `revalidateTag/Path`. | Convert at least the mutating flows (create org, create team, create component, accept invite) to Server Actions colocated under `app/<route>/actions.ts`. Provides type-safe progressive-enhanced forms and unlocks v16 cache APIs. See [Server Actions and Mutations](https://nextjs.org/docs/app/getting-started/updating-data). | **L** |
| 10 | **High** | Route segment config | All `app/**` | No `export const dynamic`, no `export const revalidate`, no `export const runtime`. Combined with the all-client approach, the router cannot apply ISR or PPR even in principle. | Once C1/C2 are addressed, declare `export const dynamic = 'force-static'` + `revalidate` per route, or rely on `use cache`. | **M** |
| 11 | **High** | SSRF / Plugin proxy | `src/app/api/plugin-proxy/route.ts:1–60` | `path` whitelist is only `startsWith('/api/v1/')` plus `!includes('..')`. No method-specific body validation, forwards client-supplied `Authorization` verbatim, no upstream Content-Type check, no body size limit, no timeout. Errors swallowed and stringified into the response. | (a) Use `AbortSignal.timeout(5000)`; (b) cap body via streaming size guard; (c) reject when upstream `Content-Type` is not `application/json` instead of `JSON.parse` failing silently; (d) drop the `?? NEXT_PUBLIC_API_URL` fallback (same as #7); (e) prefer that the iframe/plugin renderer use the unified `proxy.ts` path with an HMAC-signed plugin token rather than a separate route. | **M** |
| 12 | **High** | RSC / Hydration | `src/app/page.tsx` | `"use client"` root page that reads sessionStorage in `useEffect` then `router.replace`. Forces a client-only round-trip on the marketing path. | Once auth migrates to cookies (#2), make this a Server Component that calls `redirect('/dashboard' | '/login')` based on the cookie. Eliminates a full hydration + JS execution. | **S** |
| 13 | **High** | Error boundary coverage | `src/app/**/error.tsx` | Only 5 `error.tsx` files exist (`(protected)/error.tsx`, `analytics`, `catalog`, `environments`, `observability`, `pipelines`, `teams`). Many heavy clients (incidents, pipelines/[id], operators, custom-dashboards, organizations/[id], elasticsearch, gitops, alerting-rules) lack a segment-level error boundary. | Add per-segment `error.tsx` for every route group that does network IO or third-party rendering (XYFlow, SwaggerUI). | **M** |
| 14 | **High** | Loading / Streaming | `src/app/**/loading.tsx` | Only `(protected)/loading.tsx` and `analytics/loading.tsx` exist. Suspense usage is only **13 occurrences** in `app/`. Because pages are pure client wrappers, App Router can't stream anything except the bare shell. | After #1, add `loading.tsx` per segment and wrap each section in `<Suspense fallback={...}>` to enable progressive HTML streaming. | **M** |
| 15 | **High** | Image optimisation | `src/app/**`, `src/components/**` | `next/image` is **not used anywhere** (`grep next/image` returns 0). `public/` contains only SVGs, but if avatars, integration logos, or plugin screenshots are ever added (the catalog detail tabs already render container images), they will bypass optimisation. | Mandate `next/image` for any non-SVG asset and add an ESLint rule (`@next/next/no-img-element`) — eslint-config-next already provides it; verify it's enabled. | **S** |
| 16 | **High** | `set-state-in-effect` rule disabled 25× | 20+ files (see `grep eslint-disable-next-line react-hooks/set-state-in-effect`) | The custom lint rule documented in `copilot-instructions.md` is escaped 25 times. Many of these are legitimate cascading-render bugs that should be hoisted into `react-query` queries instead of manual `useEffect` + `setState`. | Audit each disable; convert imperative fetch-in-effect to `useQuery` (the app already has TanStack Query). Where a true cascading effect remains, refactor to event-driven state. | **M** |
| 17 | **Medium** | Architecture / BFF | `src/app/api/plugin-proxy/route.ts` + `src/proxy.ts` | Two separate proxy mechanisms with overlapping semantics (one runtime proxy + one route handler) and slightly different env-fallback logic. | Consolidate to a single proxy implementation; let `proxy.ts` handle the plugin path with an `x-farm-plugin: 1` marker. | **M** |
| 18 | **Medium** | TS config | `apps/web/tsconfig.json:3` | `"target": "ES2017"` is stale for Next 16 / React 19; adds unnecessary down-leveling work (no native `async/await`, no class fields). | Bump to `"target": "ES2022"` (or `ESNext` since Next manages compile targets via SWC/Turbopack). | **S** |
| 19 | **Medium** | Async params consistency | `src/app/(protected)/catalog/[id]/page.tsx`, `teams/[id]/page.tsx`, `queues/[name]/page.tsx`, `pipelines/[id]/page.tsx`, `iac/stacks/[id]/page.tsx`, `iac-modules/[id]/page.tsx`, `operators/[name]/page.tsx`, `organizations/[id]/page.tsx`, `plugins/registry/[id]/page.tsx` | Most dynamic pages do **not** accept `params` at all — they delegate to a client component that re-reads `useParams()`. Only `alerting-rules/[id]` and `incidents/[id]` follow the Next 16 async-params contract. | Standardise: every dynamic page should `await params` server-side and pass `id` down as a typed prop (matches the canonical v16 example). Even without server data fetching today, this gives a single typed source of truth and prevents `useParams()` `undefined` foot-guns. | **S** |
| 20 | **Medium** | Headers / CSP scope | `next.config.ts:41` | `headers()` applies CSP to every route including static assets — for `_next/static/*` and image responses CSP is unnecessary noise. | Add `source: '/((?!_next/static|_next/image|favicon\\.ico).*)'`. | **S** |
| 21 | **Medium** | `connect-src` overly broad | `next.config.ts:25` | `connect-src 'self' ws: wss: http://localhost:* https://*` — `https://*` is a global wildcard that defeats the purpose. | Restrict to the API origin, the Faro endpoint, and the OTel collector. Drop `ws:` (insecure) in production. | **S** |
| 22 | **Medium** | Build script duplication | `apps/web/package.json:6`, `Dockerfile:38-44, 58-60` | `build` shells `cp -r .next/static ... && cp -r public ...` — these are also re-copied by the Dockerfile, and `cp -r` is non-portable (won't run on Windows). Also: the script silently swallows failures (no `set -e`). | Replace with `node` script or `ncp` (cross-platform) or just remove from `npm run build` and let the Dockerfile own that responsibility. Keep `next build` only. | **S** |
| 23 | **Medium** | Suspense placement | `src/app/(protected)/layout.tsx:8–24` | `<Suspense fallback={<AppLoadingFallback />}>` wraps `<AuthGuard>` but `AuthGuard` is a Client Component and never suspends — the boundary is dead code today. | Remove or repurpose once server-side data fetching arrives (#1). | **S** |
| 24 | **Medium** | `not-found.tsx` coverage | `src/app/not-found.tsx` missing | Only `(protected)/not-found.tsx` exists. Visiting a non-existent public path falls back to the Next default. | Add a top-level `app/not-found.tsx` so the marketing/login surface gets a branded 404. | **S** |
| 25 | **Medium** | `global-error.tsx` payload | `src/app/global-error.tsx:60–74` | `useEffect` sends the error payload with `fetch ... keepalive: true` AND falls back to `sendBeacon`. The retry loop with `await new Promise(r => setTimeout(r, delay))` is fine, but the component re-runs on every state change of the parent error; `error.digest` should also be the dedup key. | Move the `JSON.stringify` and console.error outside the effect dependency list to avoid re-logging on `reset()`-triggered re-renders. Use `useRef` to track "already reported for this digest". | **S** |
| 26 | **Medium** | Bundle analyzer | `next.config.ts`, `package.json` | No `@next/bundle-analyzer`. Given `swagger-ui-react`, `@xyflow/react`, `@dagrejs/dagre`, `socket.io-client`, `winston`, `@grafana/faro-*`, `@opentelemetry/*` are all in `dependencies`, the client bundle is almost certainly heavy. | Add `@next/bundle-analyzer` + `ANALYZE=true npm run build` script. Ensure server-only libs (`winston`, `@opentelemetry/sdk-node`, `winston-daily-rotate-file`) never enter a client bundle. | **S** |
| 27 | **Medium** | Server-only modules in `dependencies` | `package.json` | `winston`, `winston-daily-rotate-file`, `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node` are in client `dependencies`. Tree-shaking + `.server.ts` suffix prevents accidental client imports, but they still bloat `node_modules` and the standalone build trace. | Either keep but document, or split server-only into a sub-package (`@farm/web-server`) consumed only from `instrumentation.ts` / `*.server.ts`. | **M** |
| 28 | **Medium** | Token refresh race | `src/lib/api-client.ts:262–351` | Module-level `isRefreshing` / `refreshPromise` is shared across all `request<T>` calls. In an RSC context (when server-rendered fetches happen across users) this would be **catastrophic cross-user state**. Today it only runs in the browser, but the bug becomes critical the moment any server-side use begins. | When migrating to BFF (#2/#1), move refresh logic to the proxy/route handler with per-request scope. | **M** |
| 29 | **Medium** | `api-client.ts` size | `src/lib/api-client.ts` | 3 259 lines, all exported from one module. Imported into every client component → defeats tree-shaking at the module-graph level even with named exports (Turbopack splits per-export, but eager evaluation of top-level code still runs). | Split per domain (auth, catalog, pipelines, observability, etc.) with barrel-free imports. Improves cold-start + parse time. | **L** |
| 30 | **Medium** | Test coverage gap | `src/proxy.ts` | New file with **zero tests**. | See #6. | **S** |
| 31 | **Medium** | Health endpoint shape | `src/app/api/health/route.ts` | Always returns `{status:'ok'}` — does not probe DB/upstream reachability. K8s liveness will mark the pod healthy even when the API proxy is broken. | Add a `?deep=1` mode that pings `API_INTERNAL_URL/health`. Keep the cheap probe for liveness, deep probe for readiness. | **S** |
| 32 | **Medium** | Standalone output paths | `Dockerfile:54–60`, `next.config.ts:36` | Layout (`apps/web/server.js`, `apps/web/.next/static`) is correct for the chosen `outputFileTracingRoot`. However, `apps/web/public` is copied separately rather than relying on standalone's auto-inclusion. | Confirmed working but document. Consider `output: 'standalone'` + `experimental.outputFileTracingExcludes` to slim the trace. | **S** |
| 33 | **Low** | Font subset | `src/app/layout.tsx:9–18` | Two Google Fonts (Nunito, JetBrains Mono) with full Latin subset. Both `display: 'swap'` ✅. | Consider `subsets: ["latin"]` already done; add `preload: true` for Nunito only (display font), `preload: false` for JetBrains Mono (code-only). | **S** |
| 34 | **Low** | View Transitions | All client navigations | React 19.2 View Transitions / `<Activity/>` not used. | Optional — wrap `router.push` in `document.startViewTransition(...)` for tab-style sub-navigation in catalog detail and observability tabs. | **S** |
| 35 | **Low** | `.dockerignore` | `apps/web/Dockerfile:32` | `COPY apps/web/ ./apps/web/` brings in `e2e/`, `coverage/`, `playwright-report/`, `storybook-static/`, `test-results/`. Excluded from build via tsconfig but inflate context. | Audit `.dockerignore`. Add the above directories. | **S** |
| 36 | **Low** | `outputFileTracingRoot` | `next.config.ts:34–36` | Correct for the monorepo layout. ✅ — informational only. | Document in `apps/web/README.md`. | **S** |
| 37 | **Low** | `turbopack.root` | `next.config.ts:38–40` | Correct top-level `turbopack` key (v16 stable, moved out of `experimental.turbo`). ✅ | None. | — |
| 38 | **Low** | E2E coverage of API routes | `apps/web/e2e/**` | No e2e covers `/api/plugin-proxy`, `/api/log-error`, `/api/health`, or the new `/api/v1/*` proxy rewrite end-to-end. | Add a `proxy.spec.ts` that asserts an authenticated request to `/api/v1/organizations` is correctly forwarded (use Playwright `route` interception of the upstream URL). | **M** |
| 39 | **Low** | `metadata` per page | `app/**/page.tsx` | Most pages rely on the root title alone. | Add `export const metadata = { title: '<Page>' }` or `generateMetadata` per top-level page. Template `'%s | Farm'` should be set on root `metadata.title.template`. | **S** |
| 40 | **Low** | `eslint.config.mjs` reachability | — | Not inspected; verify `eslint-plugin-react-hooks` v6 + the custom `react-hooks/set-state-in-effect` rule are wired in for the new `eslint-config-next@16`. | Spot-check `eslint.config.mjs`. | **S** |

---

## Action Plan by Severity

### CRITICAL — block-on-this-sprint

#### A1 · Establish a real BFF and migrate auth to httpOnly cookies *(fixes findings 2, 7, 12, 28; unlocks 1, 8, 9, 10)*
- **Steps**
  1. Extend `proxy.ts` to also handle `/api/v1/auth/login` and `/api/v1/auth/refresh`: intercept the upstream response, read the JWT/refresh from the JSON body, and set them as `httpOnly; Secure; SameSite=Lax; Path=/` cookies via `NextResponse.rewrite()` headers. Strip them from the response body returned to the browser.
  2. On every subsequent request that the proxy forwards, read the cookie and inject `Authorization: Bearer …` upstream.
  3. Delete all `sessionStorage` token handling from `api-client.ts`; the browser no longer needs the JWT.
  4. Add a `/api/v1/auth/logout` proxy path that clears the cookies (`Max-Age=0`).
  5. Convert `app/page.tsx` to a Server Component using `cookies().get('farm_session')` → `redirect()`.
- **Acceptance criteria**
  - `document.cookie` shows no `farm_session` value (httpOnly).
  - DevTools → Application → Session Storage is empty.
  - `playwright` e2e for the login flow passes end-to-end against the proxy.
  - Refresh token rotation works without client JS involvement.

#### A2 · Enforce CSP with nonces *(fixes findings 3, 20, 21)*
- **Steps**
  1. In `proxy.ts`, generate `crypto.randomUUID()` or `crypto.getRandomValues` → base64 nonce, set on `x-nonce` request header.
  2. Build CSP at request time: `script-src 'self' 'nonce-{nonce}' 'strict-dynamic'; …`.
  3. In `app/layout.tsx`, read the nonce via `headers().get('x-nonce')` (Server Component) and pass to `<Script nonce=...>` / inline JSON islands.
  4. Switch the header key from `Content-Security-Policy-Report-Only` to `Content-Security-Policy` after one week of clean reports.
  5. Narrow `connect-src` to the API + Faro + OTel endpoints; remove the global `https://*` and the `ws:` for prod.
  6. Scope `headers()` source to exclude `_next/static`, `_next/image`, `favicon.ico`.
- **Acceptance criteria**
  - Production response headers show `Content-Security-Policy:` (not Report-Only) with a per-request nonce.
  - `<script>` and `<style>` tags carry the nonce; no inline scripts without it.
  - Lighthouse "Best Practices" CSP audit passes.

#### A3 · Remove unsafe HTML injection *(fixes findings 4, 5)*
- **Steps**
  1. `npm i isomorphic-dompurify`.
  2. `DocsClient.tsx`: replace `dangerouslySetInnerHTML={{ __html: renderedHtml }}` with `DOMPurify.sanitize(renderedHtml, { USE_PROFILES: { html: true }})`.
  3. `advanced-search-modal.tsx`: drop `renderHighlight`; parse highlight fragments into an array of `{ text, emphasized }` tokens and render `<strong>` via JSX.
  4. Add a regression test asserting `<img src=x onerror=alert(1)>` is rendered as text.
- **Acceptance criteria**
  - Unit tests cover the XSS vectors above.
  - No remaining `dangerouslySetInnerHTML` outside the sanitised path.

#### A4 · Cover and harden `src/proxy.ts` *(fixes findings 6, 7)*
- **Steps**
  1. Create `src/proxy.test.ts` with `NextRequest` fixtures (`@playwright/test`-independent — use `vitest`).
  2. Wrap `new URL()` in try/catch → return `NextResponse.json({error}, {status: 502})`.
  3. Drop the `NEXT_PUBLIC_API_URL` fallback; assert `API_INTERNAL_URL` at module load.
  4. Add upstream-host allow-list (`new Set(['farm-api','localhost'])`).
  5. Add structured logging via `instrumentation.ts`-bootstrapped winston (lazy import).
- **Acceptance criteria**
  - `vitest run src/proxy.test.ts` passes with >90 % branch coverage.
  - Malformed `API_INTERNAL_URL` → 502, not 500.
  - Removed fallback verified by failing test when env var missing in `NODE_ENV=production`.

---

### HIGH — within 2 sprints

#### B1 · Adopt server-side data fetching for top-5 pages *(finding 1)*
- **Steps**: For `dashboard`, `catalog`, `catalog/[id]`, `teams`, `pipelines/[id]`: turn `page.tsx` into an async Server Component that calls a new `lib/api-server.ts` (uses `cookies()` for auth) and dehydrates the React Query cache via `<HydrationBoundary state={dehydrate(queryClient)}>` before rendering the existing `*Client.tsx`.
- **Acceptance**: View-source on `/catalog` shows the first page of component rows in HTML (not an empty shell). Time-to-interactive halves on slow 3G.

#### B2 · Introduce `use cache` + cache tagging *(findings 8, 10)*
- **Steps**: Annotate `lib/api-server.ts#getCatalogComponents`, `#getPlugins`, etc. with `'use cache'` and `cacheTag('catalog')`. In Server Actions (B3) call `revalidateTag('catalog')` after mutation.
- **Acceptance**: Navigation between `/catalog` and `/catalog/[id]` is instant on the second visit (PPR shell).

#### B3 · Server Actions for the create/update flows *(finding 9)*
- **Steps**: Create `app/(protected)/catalog/new/actions.ts` (`'use server'`) and convert `NewComponentClient.onSubmit` to call the action via `<form action={createComponent}>` with `useActionState` for inline errors. Repeat for orgs, teams, alerting-rules.
- **Acceptance**: Form submits without JS (test with JS disabled). `revalidateTag('catalog')` invoked in the action.

#### B4 · Plugin-proxy hardening *(finding 11)*
- **Steps**: Add `AbortSignal.timeout(8000)`; reject `Content-Type` ≠ JSON; cap body to 1 MiB; remove duplicate env fallback; consolidate into the BFF (#A1).
- **Acceptance**: Trivy/SAST-style review identifies no remaining SSRF vector; e2e covers timeout path.

#### B5 · Error and loading boundary coverage *(findings 13, 14)*
- **Steps**: Generate `error.tsx` + `loading.tsx` per remaining top-level route segment. Wrap each `*Client` in `<Suspense>`.
- **Acceptance**: Every directory in `app/(protected)/*/` contains both files; navigation always shows a skeleton before content.

#### B6 · Image, font and ESLint hygiene *(finding 15, 16)*
- **Steps**: Enable `@next/next/no-img-element` (verify in `eslint.config.mjs`). Pre-emptively wire `next/image` example in `components/ui/`. Audit and remove the 25 `eslint-disable-next-line react-hooks/set-state-in-effect` annotations one by one — most should become `useQuery`/`useMutation`.
- **Acceptance**: `grep eslint-disable-next-line react-hooks/set-state-in-effect src/` returns ≤5 (only justified cases with adjacent comment).

---

### MEDIUM — within the quarter

- **C1 (#17)** Consolidate plugin-proxy into the unified BFF.
- **C2 (#18)** Bump `tsconfig.target` to `ES2022` and re-baseline `tsbuildinfo`.
- **C3 (#19)** Standardise all dynamic pages on `async function Page({ params })` with `await params`.
- **C4 (#22, #35)** Replace `cp -r` in `package.json` script with cross-platform copy or remove (Dockerfile owns it); tighten `.dockerignore`.
- **C5 (#23)** Remove the dead `<Suspense>` in `(protected)/layout.tsx` (or repurpose after B1).
- **C6 (#24)** Add a root `app/not-found.tsx`.
- **C7 (#25)** Add `useRef` dedup for global-error reporting; move `JSON.stringify` outside the effect.
- **C8 (#26)** Wire `@next/bundle-analyzer`; track JS shipped per route in CI.
- **C9 (#27)** Move server-only OTel/winston into a sub-package consumed only by `*.server.ts` files.
- **C10 (#30)** Proxy test coverage (subsumed by A4).
- **C11 (#31)** Add deep readiness probe.
- **C12 (#38)** Playwright spec for the proxy round-trip.
- **Acceptance** (global): CI reports no decreased coverage, no new lint disables.

---

### LOW — opportunistic

- **D1 (#33)** Tune font `preload` flags.
- **D2 (#34)** Use View Transitions for tab-style nav.
- **D3 (#37, #36)** Document `outputFileTracingRoot` + `turbopack.root` rationale in `apps/web/README.md`.
- **D4 (#39)** Per-page metadata + root `metadata.title.template = '%s | Farm'`.
- **D5 (#40)** Verify `eslint.config.mjs` registers the custom rule under `eslint-config-next@16`.

---

## Citations (Next.js 16 / React 19 official docs)

- App Router fundamentals — https://nextjs.org/docs/app
- **Cache Components / `use cache`** — https://nextjs.org/docs/app/api-reference/directives/use-cache
- Caching guide — https://nextjs.org/docs/app/guides/caching
- Partial Prerendering — https://nextjs.org/docs/app/getting-started/partial-prerendering
- `revalidateTag` / `updateTag` / `refresh` — https://nextjs.org/docs/app/api-reference/functions/revalidate-tag
- Async `params` / `searchParams` — https://nextjs.org/docs/app/api-reference/file-conventions/page#props
- Proxy (formerly Middleware) — https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- Server Actions and Mutations — https://nextjs.org/docs/app/getting-started/updating-data
- Authentication (httpOnly cookies pattern) — https://nextjs.org/docs/app/guides/authentication
- Content Security Policy + nonces — https://nextjs.org/docs/app/guides/content-security-policy
- `output: 'standalone'` + monorepo — https://nextjs.org/docs/app/api-reference/config/next-config-js/output
- `outputFileTracingRoot` — https://nextjs.org/docs/app/api-reference/config/next-config-js/outputFileTracingRoot
- Turbopack (stable in v16) — https://nextjs.org/docs/app/api-reference/turbopack
- `instrumentation.ts` / `onRequestError` — https://nextjs.org/docs/app/guides/instrumentation
- `error.tsx` / `global-error.tsx` — https://nextjs.org/docs/app/api-reference/file-conventions/error
- `loading.tsx` + streaming with Suspense — https://nextjs.org/docs/app/api-reference/file-conventions/loading
- Metadata API — https://nextjs.org/docs/app/getting-started/metadata-and-og-images
- `next/dynamic` `ssr: false` semantics in App Router — https://nextjs.org/docs/app/guides/lazy-loading
- React 19 reference — https://react.dev/blog/2024/12/05/react-19

---

**End of audit. No source files were modified.**

Let me know if you want me to:
1. Write this content to `.github/agents/audits/nextjs-audit.md` (would require you to confirm overriding my no-file-output guardrail), or
2. Start executing any of the action items (e.g., A4 — adding `proxy.test.ts` — is a clean self-contained S/M task).
