{{/*
farm.validateValues — Guards that run on every render when api.existingSecret is
not set. Both checks are skipped entirely when existingSecret is configured
because the secret is managed externally and the chart has no visibility into
its contents.
*/}}
{{- define "farm.validateValues" -}}

{{- /* ── FARM-S576: JWT_SECRET strength check ────────────────────────────── */}}
{{- if not .Values.api.existingSecret -}}
  {{- $jwt := .Values.api.secrets.JWT_SECRET | default "" -}}
  {{- $placeholder := "change-me-this-must-be-at-least-32-characters-long" -}}
  {{- if eq $jwt $placeholder -}}
    {{- fail "FARM-S576: api.secrets.JWT_SECRET is set to the placeholder default value. Provide a unique secret (>=32 chars) or configure api.existingSecret to reference an externally managed Kubernetes Secret." -}}
  {{- end -}}
  {{- if lt (len $jwt) 32 -}}
    {{- fail (printf "FARM-S576: api.secrets.JWT_SECRET must be at least 32 characters long (current length: %d). Provide a stronger value or configure api.existingSecret." (len $jwt)) -}}
  {{- end -}}
{{- end -}}

{{- /* ── FARM-S583: externalDatabase.host required when subchart is off ───── */}}
{{- /*
     When postgresql.enabled=false the application connects to an operator-
     managed database. An empty externalDatabase.host makes the migration Job
     and the API pod silently connect to nothing, causing obscure failures at
     runtime instead of a loud error at deploy time.
*/}}
{{- if and (not .Values.postgresql.enabled) (not .Values.externalDatabase.host) -}}
  {{- fail "FARM-S583: When postgresql.enabled=false, externalDatabase.host must be set. Configure externalDatabase.host (or externalDatabase.existingSecret) to point to your production database, or set postgresql.enabled=true to use the bundled subchart (dev/staging only)." -}}
{{- end -}}
{{- if and (not .Values.redis.enabled) (empty .Values.externalRedis.host) }}
{{- fail "externalRedis.host is required when redis.enabled is false. Set externalRedis.host to your Redis endpoint." }}
{{- end }}
{{- if and .Values.prometheusRule.enabled (eq (default "" .Values.prometheusRule.alertmanagerReceiverName) "") -}}
  {{- fail "FARM-S587: prometheusRule.alertmanagerReceiverName must be set when prometheusRule.enabled=true. Set it to a valid Alertmanager receiver name (e.g. \"pagerduty\", \"slack-farm-alerts\") or to \"null\" in non-production environments to use the built-in no-op receiver." -}}
{{- end -}}
{{- end -}}
