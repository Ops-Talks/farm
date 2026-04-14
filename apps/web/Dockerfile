# Stage 1: Install dependencies
# Context is the monorepo root so that workspace packages (packages/*) are accessible.
FROM node:20-alpine AS deps
WORKDIR /app

# Copy root workspace manifest and lockfile first for layer caching.
COPY package.json package-lock.json ./

# Copy every workspace package.json so npm understands the workspace graph.
COPY packages/types/package.json        ./packages/types/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY apps/web/package.json              ./apps/web/
COPY apps/api/package.json              ./apps/api/

RUN npm ci --ignore-scripts

# Build @farm/types so the workspace symlink target has compiled JS.
COPY packages/types/src ./packages/types/src
COPY packages/types/tsconfig.json ./packages/types/tsconfig.json
RUN cd packages/types && npx tsc

# Stage 2: Build Next.js app
FROM node:20-alpine AS builder
WORKDIR /app

# node_modules includes the symlink node_modules/@farm/types -> ../../packages/types
COPY --from=deps /app/node_modules   ./node_modules
# The symlink target must be present with compiled dist/
COPY --from=deps /app/packages/types ./packages/types

COPY apps/web/ ./apps/web/

WORKDIR /app/apps/web

ARG API_INTERNAL_URL=http://api:3000/api
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache --upgrade \
    "zlib>=1.3.2-r0" \
    "libssl3>=3.5.6-r0" \
    "libcrypto3>=3.5.6-r0" \
    "musl>=1.2.5-r22" \
    "musl-utils>=1.2.5-r22" \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# When outputFileTracingRoot points to the monorepo root, the standalone output
# mirrors the full directory structure: server.js lands at apps/web/server.js.
COPY --from=builder /app/apps/web/public                           ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static    ./apps/web/.next/static

USER nextjs
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
