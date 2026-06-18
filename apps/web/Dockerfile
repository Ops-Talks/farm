# syntax=docker/dockerfile:1.7
# Stage 1: Install dependencies
# Context is the monorepo root so that workspace packages (packages/*) are accessible.
# The `# syntax=` directive above enables BuildKit features such as
# `RUN --mount=type=cache` used in the deps and builder stages (FARM-S543).
FROM node:26-alpine@sha256:9c0e1e52125d6b67d505cf75b4880fcf1290ccea5c480849910e1d57b2cf72b5 AS deps
LABEL org.opencontainers.image.title="farm-web" \
      org.opencontainers.image.description="Farm portal — Next.js web application" \
      org.opencontainers.image.source="https://github.com/Ops-Talks/farm"
WORKDIR /app

# Copy root workspace manifest and lockfile first for layer caching.
COPY package.json package-lock.json ./

# Copy every workspace package.json so npm understands the workspace graph.
COPY packages/types/package.json        ./packages/types/
COPY apps/web/package.json              ./apps/web/
COPY apps/api/package.json              ./apps/api/

RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --ignore-scripts

# Build @farm/types so the workspace symlink target has compiled JS.
COPY packages/types/src ./packages/types/src
COPY packages/types/tsconfig.json ./packages/types/tsconfig.json
RUN npm run build --workspace=@farm/types

# Stage 2: Build Next.js app
FROM node:26-alpine@sha256:9c0e1e52125d6b67d505cf75b4880fcf1290ccea5c480849910e1d57b2cf72b5 AS builder
WORKDIR /app

# node_modules includes the symlink node_modules/@farm/types -> ../../packages/types
COPY --from=deps /app/node_modules          ./node_modules
# npm may install workspace-only packages in the workspace's own node_modules
# instead of hoisting them to root (e.g. @vitejs/plugin-react).
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
# The symlink target must be present with compiled dist/
COPY --from=deps /app/packages/types        ./packages/types

# .dockerignore excludes **/node_modules so this COPY never overwrites the above.
COPY apps/web/ ./apps/web/

WORKDIR /app/apps/web

ARG API_INTERNAL_URL=http://api:3000/api
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
ENV NEXT_TELEMETRY_DISABLED=1
# Cache the Next.js incremental build cache across builds (FARM-S543). The
# directory lives inside the project (`<project>/.next/cache`) and is repopulated
# on every `next build`; persisting it across builds skips Babel/SWC transforms
# and the webpack module graph for unchanged files.
RUN --mount=type=cache,target=/app/apps/web/.next/cache,sharing=locked \
    npm run build

# Stage 3: Production
FROM node:26-alpine@sha256:9c0e1e52125d6b67d505cf75b4880fcf1290ccea5c480849910e1d57b2cf72b5 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Apply latest available security patches from the pinned base image's apk
# repositories. Hardcoded "pkg>=x.y.z-rN" pins are intentionally avoided here:
# they have broken CI repeatedly when Alpine repushed patched versions under
# different version strings. CVE coverage is enforced by the Trivy gate in
# .github/workflows/trivy.yml and base-image digest bumps via Dependabot.
RUN apk upgrade --no-cache openssl zlib musl \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# When outputFileTracingRoot points to the monorepo root, the standalone output
# mirrors the full directory structure: server.js lands at apps/web/server.js.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public           ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static    ./apps/web/.next/static

USER nextjs
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Shared healthcheck entrypoint (FARM-S541) used by Dockerfile HEALTHCHECK,
# docker-compose, and any K8s exec probes. Pure Node, no dependencies.
COPY --chown=nextjs:nodejs apps/web/scripts/healthcheck.js ./apps/web/scripts/healthcheck.js

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD ["node", "apps/web/scripts/healthcheck.js"]

CMD ["node", "apps/web/server.js"]
