# Git Commit — Phase 10: Test Coverage ≥80% (FARM-E45)

```bash
git add -A && git commit -m "test: achieve ≥80% coverage on all metrics for API and web (FARM-E45)

Phase 10 (FARM-E45) — full test coverage hardening pass.

API (apps/api):
- Add branch-coverage tests for observability.controller, analytics.controller,
  teams.controller, catalog.controller, integrations-listener.service,
  deployments.service, auth.controller, jenkins.service, istio-metrics.service,
  logger.config, compliance-audit.service/processor, catalog.service,
  google.strategy, observability.service, webhook.service,
  documentation.service, kubernetes.service, kyverno-policy-report.service,
  pipelines.service
- Enforce coverageThreshold in apps/api/package.json: branches/statements/
  functions/lines all set to 80

Web (apps/web):
- Add and expand tests for DocsClient, CICDTab, app-shell, health-tab,
  NewOrgClient, run-detail, run-stats, danger-zone, traces-tab, otel-spans,
  TeamsClient, CatalogAnalyticsTab, organization-context, ws-client, api-client
- Enforce coverage thresholds in apps/web/vitest.config.ts: branches/
  statements/functions/lines all set to 80

Lint fixes:
- Replace unsafe as any casts with as unknown as T double-cast pattern
- Remove async keyword from mock implementations that have no await
- Remove unused arrow-function parameter names (_req, _res, _next)
- Update obsolete eslint-disable rule name no-throw-literal to
  only-throw-error (typescript-eslint v8 rename)
- Remove unused mock variable declarations left by generated tests

Results:
- API : stmt 86.82% / branch 80.18% / fn 87.90% / lines 87.15%
- Web : stmt 85.80% / branch 80.00% / fn 82.38% / lines 86.85%
- Total: 1082 API tests + 1239 web tests = 2321 passing, 0 failures

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
