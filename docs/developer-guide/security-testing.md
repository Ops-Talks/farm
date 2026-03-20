# Security Testing

Farm ships four automated security testing layers that run in GitHub Actions CI/CD. Together they cover static code analysis, runtime attack surface scanning, secret detection, and container image vulnerabilities — complementing the unit, E2E, and accessibility test suites.

## Overview

| Layer | Tool | Trigger | Blocks merge on |
|-------|------|---------|-----------------|
| SAST | CodeQL + eslint-plugin-security | push / PR | Any finding above threshold |
| DAST | OWASP ZAP | push / PR (baseline), schedule (active) | ZAP alerts flagged FAIL |
| Secret Scanning | Gitleaks | push / PR | Any detected secret |
| Container Security | Trivy | push / PR / schedule | CRITICAL CVEs |

Accessibility testing (axe-core) runs as part of the Vitest suite — see [Frontend Testing](frontend/testing.md).

---

## SAST — Static Application Security Testing

**Workflow**: `.github/workflows/sast.yml`

Three jobs run in parallel:

### CodeQL

Uses `github/codeql-action` with `build-mode: none` for JavaScript/TypeScript. No compilation step is needed — CodeQL analyzes the source directly.

```yaml
- uses: github/codeql-action/analyze@v3
  with:
    build-mode: none
```

Results appear in the **GitHub Security** tab under Code Scanning. Any new finding blocks the PR.

### npm Audit

Runs `npm audit --omit=dev --audit-level=high` against the API workspace. Dev-only tools (`@nestjs/cli`, `release-it`) are excluded because they carry transitive vulnerabilities that cannot be fixed without breaking changes and are never shipped to production.

```bash
npm audit --omit=dev --audit-level=high -w apps/api
```

### ESLint Security

Runs `eslint-plugin-security` rules on both `apps/api` and `apps/web`. Rules flag common Node.js vulnerabilities: unsafe regex, object injection, prototype pollution, and eval usage.

```bash
npm run lint -w apps/api
npm run lint -w apps/web
```

---

## DAST — Dynamic Application Security Testing

**Workflow**: `.github/workflows/dast.yml`

DAST requires a running application. The workflow starts the Farm API (NestJS + SQLite in-memory) and runs ZAP against it.

### Baseline Scan (passive)

Runs on every **push and PR**. Spiders the application and records observations without sending attack payloads. Safe to run in CI without risk of data corruption.

```yaml
- uses: zaproxy/action-baseline@v0.14.0
  with:
    target: http://localhost:3000/api
    rules_file_name: .github/zap/baseline-rules.tsv
```

### API Scan (active)

Runs on **schedule** (weekly) and **manual dispatch** only — never on PRs. Fetches the OpenAPI spec from `/api/docs-json` (Basic Auth protected) and actively fuzzes every endpoint.

```bash
# The OpenAPI spec endpoint requires Basic Auth
curl -u "$SWAGGER_USER:$SWAGGER_PASSWORD" \
  http://localhost:3000/api/docs-json -o /tmp/openapi.json
```

JWT authentication is set up before the scan so ZAP can reach protected endpoints:

```bash
# Register test user (tolerate 409 = already exists)
REGISTER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST ...)
if [[ "$REGISTER_STATUS" != "2"* && "$REGISTER_STATUS" != "409" ]]; then
  exit 1
fi
TOKEN=$(curl ... | jq -r '.accessToken')
if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then exit 1; fi
```

### False-positive Rules

`.github/zap/baseline-rules.tsv` suppresses known false-positives:

| Rule ID | Description | Disposition |
|---------|-------------|-------------|
| 10202 | Anti-CSRF tokens | IGNORE — Farm uses stateless JWT; no session cookies anywhere |
| 10021 | X-Content-Type-Options | IGNORE — header set by Next.js, not the NestJS API |
| 10035 | Strict-Transport-Security | IGNORE — HTTPS/HSTS is enforced at the reverse proxy layer |

---

## Secret Scanning — Gitleaks

**Workflow**: `.github/workflows/secret-scan.yml`

Gitleaks scans every commit diff at push time using the default ruleset from `gitleaks/gitleaks-action@v2`. The full git history is fetched (`fetch-depth: 0`) so commits pushed together in a batch are all checked.

```yaml
- uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Configuration — `.gitleaks.toml`

The default ruleset flags generic secrets (API keys, JWTs, private keys). Farm's test suite contains intentional test fixtures that are not real secrets. These are allowlisted in `.gitleaks.toml`:

```toml
[[allowlists]]
description = "Test fixture JWT secrets"
paths = [
  '''apps/api/test/helpers/e2e-setup\.ts''',
  '''apps/api/src/modules/auth/strategies/keycloak\.strategy\.spec\.ts''',
  # ... other spec files
]

[[allowlists]]
description = "Configuration default placeholder"
regexes = ['''super-secret-key-change-me-in-production''']
paths = ['''apps/api/src/config/configuration\.ts''']
```

**Rule**: If a real secret is accidentally added, the PR is blocked immediately before it reaches `main`. The secret must be removed from git history (e.g., `git filter-repo`) and rotated before the branch can be merged.

---

## Container Security — Trivy

**Workflow**: `.github/workflows/trivy.yml`

Trivy scans the Farm API Docker image for OS-level and library CVEs after it is built in CI.

### Image Build

The API Dockerfile uses the monorepo root as build context to access `packages/types`:

```yaml
- uses: docker/build-push-action@v6
  with:
    context: .
    file: apps/api/Dockerfile
    push: false
    load: true
    tags: farm-api:${{ github.sha }}
```

### Scan

```yaml
# Step 1: generate SARIF covering CRITICAL and HIGH for the Security tab
- uses: aquasecurity/trivy-action@0.30.0
  with:
    image-ref: farm-api:${{ github.sha }}
    format: sarif
    output: trivy-results.sarif
    severity: CRITICAL,HIGH
    exit-code: '0'          # never blocks — reporting only
    ignore-unfixed: true
    vuln-type: os,library

# Step 2: gate — fails only when CRITICAL CVEs are present
- uses: aquasecurity/trivy-action@0.30.0
  with:
    image-ref: farm-api:${{ github.sha }}
    format: table
    severity: CRITICAL
    exit-code: '1'          # blocks the build
    ignore-unfixed: true
    vuln-type: os,library
```

- **Step 1** runs `severity: CRITICAL,HIGH` with `exit-code: '0'` — uploads all HIGH and CRITICAL findings to the GitHub Security tab for visibility without blocking the build.
- **Step 2** runs `severity: CRITICAL` with `exit-code: '1'` — fails the build **only when CRITICAL CVEs** are present. HIGH findings are surfaced in the Security tab but treated as warnings.

SARIF results are uploaded to the **GitHub Security** tab (Code Scanning) and also saved as a build artifact (30-day retention).

### Remediation

When Trivy reports a CRITICAL CVE:

1. Check if the vulnerability is in the Node.js base image — update `FROM node:20-alpine` to a patched version
2. Check if it is in a direct dependency — `npm update <package> -w apps/api`
3. Check if it is in a transitive dependency — add a resolution override in `package.json` if a safe version is available

---

## Accessibility Testing — axe-core

Accessibility tests run as part of the Vitest frontend test suite, not in a separate workflow.

**Library**: `vitest-axe` (wraps axe-core for vitest)

```bash
npm run test -w apps/web
```

### Pattern

```tsx
import { axe, toHaveNoViolations } from 'vitest-axe'
import { expect } from 'vitest'

expect.extend(toHaveNoViolations)

it('has no accessibility violations', async () => {
  const { container } = render(<MyPage />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
}, 10000)
```

### Coverage

Axe checks are present in the following test files:

| Page | File |
|------|------|
| Login | `apps/web/src/app/login/page.test.tsx` |
| Catalog | `apps/web/src/app/(protected)/catalog/page.test.tsx` |
| Environments | `apps/web/src/app/(protected)/environments/_components/*.test.tsx` |
| Teams | `apps/web/src/app/(protected)/teams/page.test.tsx` |
| Pipelines | `apps/web/src/app/(protected)/pipelines/page.test.tsx` |
| Observability | `apps/web/src/app/(protected)/observability/page.test.tsx` |

### WCAG Compliance Target

All axe tests assert zero violations against the **WCAG 2.1 AA** ruleset (axe-core default).

---

## CI Badges

```markdown
[![SAST](https://github.com/Ops-Talks/farm/actions/workflows/sast.yml/badge.svg)](https://github.com/Ops-Talks/farm/actions/workflows/sast.yml)
[![DAST](https://github.com/Ops-Talks/farm/actions/workflows/dast.yml/badge.svg)](https://github.com/Ops-Talks/farm/actions/workflows/dast.yml)
[![Secret Scanning](https://github.com/Ops-Talks/farm/actions/workflows/secret-scan.yml/badge.svg)](https://github.com/Ops-Talks/farm/actions/workflows/secret-scan.yml)
[![Container Security](https://github.com/Ops-Talks/farm/actions/workflows/trivy.yml/badge.svg)](https://github.com/Ops-Talks/farm/actions/workflows/trivy.yml)
```
