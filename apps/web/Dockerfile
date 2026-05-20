# Stage 1: Install dependencies
# Context is the monorepo root so that workspace packages (packages/*) are accessible.
FROM node:26-alpine AS deps
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

RUN npm ci --ignore-scripts

# Build @farm/types so the workspace symlink target has compiled JS.
COPY packages/types/src ./packages/types/src
COPY packages/types/tsconfig.json ./packages/types/tsconfig.json
RUN cd packages/types && npx tsc

# Stage 2: Build Next.js app
FROM node:26-alpine AS builder
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
RUN npm run build

# Stage 3: Production
FROM node:26-alpine AS runner
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
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public           ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static    ./apps/web/.next/static

USER nextjs
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "const http = require('http'); const req = http.request({hostname:'localhost',port:3001,path:'/api/health',timeout:5000}, res => process.exit(res.statusCode === 200 ? 0 : 1)); req.on('error', () => process.exit(1)); req.end();"

CMD ["node", "apps/web/server.js"]
