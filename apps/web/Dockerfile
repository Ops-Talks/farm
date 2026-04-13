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

# Update npm to a pinned version whose bundled tar dependency meets the
# minimum fixed version (>=7.5.11) required by CVE-2026-31802, CVE-2026-29786,
# CVE-2026-26960, CVE-2026-24842, CVE-2026-23950, and CVE-2026-23745.
#
# Patch picomatch inside npm's own bundled node_modules to 4.0.4 (CVE-2026-33671).
# The fixed copy is taken directly from the deps stage (already at 4.0.4 via
# package.json overrides), so no registry download is needed at build time.
# brace-expansion is upgraded to 5.0.5 via npm pack (no workspace copy available
# at the required version).
#
# The for loop with "|| exit 1" is used instead of piping find to while, because
# Alpine sh runs the while body in a subshell and does not propagate inner errors
# to the outer exit code, causing silent patch failures.
COPY --from=deps /app/node_modules/picomatch /tmp/picomatch-fixed
RUN npm install -g npm@11.12.1 \
 && picomatch_dirs="$(find /usr/local/lib/node_modules/npm -path '*/picomatch' -type d)" \
 && test -n "$picomatch_dirs" || { echo "No bundled picomatch found in npm"; exit 1; } \
 && for dir in $picomatch_dirs; do cp -rf /tmp/picomatch-fixed/. "$dir/" || exit 1; done \
 && rm -rf /tmp/picomatch-fixed \
 && npm pack brace-expansion@5.0.5 --quiet \
 && brace_dirs="$(find /usr/local/lib/node_modules/npm -path '*/brace-expansion' -type d)" \
 && test -n "$brace_dirs" || { echo "No bundled brace-expansion found in npm"; exit 1; } \
 && for dir in $brace_dirs; do tar xzf brace-expansion-5.0.5.tgz --strip-components=1 -C "$dir" || exit 1; done \
 && rm brace-expansion-5.0.5.tgz

# Upgrade Alpine system packages to their patched versions:
#   zlib       >=1.3.2-r0  CVE-2026-27171, CVE-2026-22184
#   libssl3    >=3.5.6-r0  CVE-2026-28390, CVE-2026-31790
#   libcrypto3 >=3.5.6-r0  required alongside libssl3
#   musl       >=1.2.5-r22 CVE-2026-6042 (security flaw in musl libc up to 1.2.6)
RUN apk add --no-cache --upgrade \
    "zlib>=1.3.2-r0" \
    "libssl3>=3.5.6-r0" \
    "libcrypto3>=3.5.6-r0" \
    "musl>=1.2.5-r22" \
    "musl-utils>=1.2.5-r22"

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
