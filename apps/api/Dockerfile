# Context is the monorepo root so that workspace packages (packages/*) are accessible.

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy root workspace manifest and lockfile for layer caching.
COPY package.json package-lock.json ./

# Copy every workspace package.json so npm understands the workspace graph.
COPY packages/types/package.json         ./packages/types/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY apps/api/package.json               ./apps/api/
COPY apps/web/package.json               ./apps/web/

RUN npm ci --ignore-scripts

# Build @farm/types so the workspace symlink target has compiled JS + types.
COPY packages/types/src         ./packages/types/src
COPY packages/types/tsconfig.json ./packages/types/tsconfig.json
RUN cd packages/types && npx tsc

# Stage 2: Build NestJS app
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules    ./node_modules
COPY --from=deps /app/packages/types  ./packages/types

COPY apps/api ./apps/api

WORKDIR /app/apps/api
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Copy root manifests for npm ci --omit=dev
COPY package.json package-lock.json ./
COPY packages/types/package.json         ./packages/types/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY apps/api/package.json               ./apps/api/
COPY apps/web/package.json               ./apps/web/

RUN npm ci --omit=dev --ignore-scripts

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
