# Context is the monorepo root so that workspace packages (packages/*) are accessible.

# Stage 1: Install dependencies
FROM node:26-alpine@sha256:7c6af15abe4e3de859690e7db171d0d711bf37d27528eddfe625b2fe89e097f8 AS deps
LABEL org.opencontainers.image.title="farm-api" \
      org.opencontainers.image.description="Farm portal — NestJS API service" \
      org.opencontainers.image.source="https://github.com/Ops-Talks/farm"
WORKDIR /app

# Copy root workspace manifest and lockfile for layer caching.
COPY package.json package-lock.json ./

# Copy every workspace package.json so npm understands the workspace graph.
COPY packages/types/package.json         ./packages/types/
COPY apps/api/package.json               ./apps/api/
COPY apps/web/package.json               ./apps/web/

RUN npm ci --ignore-scripts

# Build @farm/types so the workspace symlink target has compiled JS + types.
COPY packages/types/src         ./packages/types/src
COPY packages/types/tsconfig.json ./packages/types/tsconfig.json
RUN cd packages/types && npx tsc

# Stage 2: Build NestJS app
FROM node:26-alpine@sha256:7c6af15abe4e3de859690e7db171d0d711bf37d27528eddfe625b2fe89e097f8 AS build
WORKDIR /app

COPY --from=deps /app/node_modules           ./node_modules
# npm may install workspace-only packages in the workspace's own node_modules
# instead of hoisting them to root (e.g. @bull-board/api, @bull-board/nestjs).
# Copy both to ensure TypeScript can resolve all imports.
COPY --from=deps /app/apps/api/node_modules  ./apps/api/node_modules
COPY --from=deps /app/packages/types         ./packages/types

COPY package.json package-lock.json ./
COPY packages/types/package.json    ./packages/types/
COPY apps/api/package.json          ./apps/api/

# .dockerignore excludes **/node_modules so this COPY never overwrites the above.
COPY apps/api ./apps/api

WORKDIR /app/apps/api
RUN npm run build

# Stage 3: Production image
FROM node:26-alpine@sha256:7c6af15abe4e3de859690e7db171d0d711bf37d27528eddfe625b2fe89e097f8 AS production
WORKDIR /app
ENV NODE_ENV=production

# Apply latest available security patches from the pinned base image's apk
# repositories. Hardcoded "pkg>=x.y.z-rN" pins are intentionally avoided here:
# they have broken CI repeatedly when Alpine repushed patched versions under
# different version strings. CVE coverage is enforced by the Trivy gate in
# .github/workflows/trivy.yml and base-image digest bumps via Dependabot.
RUN apk upgrade --no-cache

# Copy root manifests for npm ci --omit=dev
COPY package.json package-lock.json ./
COPY packages/types/package.json         ./packages/types/
COPY apps/api/package.json               ./apps/api/
COPY apps/web/package.json               ./apps/web/

# Install ONLY the API workspace's production dependencies.
# Without --workspace, npm ci would install all workspaces (including apps/web with
# Next.js, React, Tailwind, etc.), inflating the production image by ~1GB+.
RUN npm ci --omit=dev --ignore-scripts --workspace=apps/api \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# Copy compiled @farm/types (needed at runtime for any require('@farm/types'))
COPY --from=build /app/packages/types ./packages/types

# Copy compiled NestJS output
COPY --from=build /app/apps/api/dist ./apps/api/dist

RUN mkdir -p apps/api/logs && chown -R node:node apps/api/logs

WORKDIR /app/apps/api
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "const http = require('http'); const req = http.request({hostname:'localhost',port:3000,path:'/api/health',timeout:5000}, res => process.exit(res.statusCode === 200 ? 0 : 1)); req.on('error', () => process.exit(1)); req.end();"
USER node
CMD ["node", "dist/main"]
