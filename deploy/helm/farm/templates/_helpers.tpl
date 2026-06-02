{{/*
Expand the name of the chart.
*/}}
{{- define "farm.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
Truncated at 63 characters because Kubernetes DNS naming rules require it.
*/}}
{{- define "farm.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart version string for use in labels.
*/}}
{{- define "farm.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels applied to all resources.
*/}}
{{- define "farm.labels" -}}
helm.sh/chart: {{ include "farm.chart" . }}
app.kubernetes.io/name: {{ include "farm.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
API-specific selector labels.
*/}}
{{- define "farm.api.selectorLabels" -}}
app.kubernetes.io/name: {{ include "farm.name" . }}-api
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: api
{{- end }}

{{/*
Web-specific selector labels.
*/}}
{{- define "farm.web.selectorLabels" -}}
app.kubernetes.io/name: {{ include "farm.name" . }}-web
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: web
{{- end }}

{{/*
Common labels for the API workload.
*/}}
{{- define "farm.api.labels" -}}
helm.sh/chart: {{ include "farm.chart" . }}
{{ include "farm.api.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Common labels for the Web workload.
*/}}
{{- define "farm.web.labels" -}}
helm.sh/chart: {{ include "farm.chart" . }}
{{ include "farm.web.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Migration-specific selector labels.
*/}}
{{- define "farm.migration.selectorLabels" -}}
app.kubernetes.io/name: {{ include "farm.name" . }}-migration
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: migration
{{- end }}

{{/*
Migration-specific labels (full set for pod templates).
*/}}
{{- define "farm.migration.labels" -}}
helm.sh/chart: {{ include "farm.chart" . }}
{{ include "farm.migration.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Render the full API image reference: [registry/]repository:tag
*/}}
{{- define "farm.api.image" -}}
{{- $registry := .Values.api.image.registry | default .Values.global.imageRegistry -}}
{{- $repository := .Values.api.image.repository -}}
{{- $tag := .Values.api.image.tag | default .Chart.AppVersion -}}
{{- if $registry -}}
{{- printf "%s/%s:%s" $registry $repository $tag -}}
{{- else -}}
{{- printf "%s:%s" $repository $tag -}}
{{- end -}}
{{- end }}

{{/*
Render the full Web image reference: [registry/]repository:tag
*/}}
{{- define "farm.web.image" -}}
{{- $registry := .Values.web.image.registry | default .Values.global.imageRegistry -}}
{{- $repository := .Values.web.image.repository -}}
{{- $tag := .Values.web.image.tag | default .Chart.AppVersion -}}
{{- if $registry -}}
{{- printf "%s/%s:%s" $registry $repository $tag -}}
{{- else -}}
{{- printf "%s:%s" $repository $tag -}}
{{- end -}}
{{- end }}

{{/*
API ServiceAccount name.
*/}}
{{- define "farm.api.serviceAccountName" -}}
{{- if .Values.api.serviceAccount.create }}
{{- default (printf "%s-api" (include "farm.fullname" .)) .Values.api.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.api.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Web ServiceAccount name.
*/}}
{{- define "farm.web.serviceAccountName" -}}
{{- if .Values.web.serviceAccount.create }}
{{- default (printf "%s-web" (include "farm.fullname" .)) .Values.web.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.web.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Resolve the database host.
Uses the Bitnami postgresql subchart service name when postgresql.enabled is true,
otherwise falls back to externalDatabase.host.
*/}}
{{- define "farm.databaseHost" -}}
{{- if .Values.postgresql.enabled -}}
{{- printf "%s-postgresql" (include "farm.fullname" .) -}}
{{- else -}}
{{- .Values.externalDatabase.host -}}
{{- end -}}
{{- end }}

{{/*
Resolve the database port.
*/}}
{{- define "farm.databasePort" -}}
{{- if .Values.postgresql.enabled -}}
{{- print "5432" -}}
{{- else -}}
{{- .Values.externalDatabase.port | toString -}}
{{- end -}}
{{- end }}

{{/*
Resolve the database user.
*/}}
{{- define "farm.databaseUser" -}}
{{- if .Values.postgresql.enabled -}}
{{- .Values.postgresql.auth.username -}}
{{- else -}}
{{- .Values.externalDatabase.user -}}
{{- end -}}
{{- end }}

{{/*
Resolve the database name.
*/}}
{{- define "farm.databaseName" -}}
{{- if .Values.postgresql.enabled -}}
{{- .Values.postgresql.auth.database -}}
{{- else -}}
{{- .Values.externalDatabase.name -}}
{{- end -}}
{{- end }}

{{/*
Resolve the Redis host.
Uses the Bitnami redis subchart service name when redis.enabled is true,
otherwise falls back to externalRedis.host.
*/}}
{{- define "farm.redisHost" -}}
{{- if .Values.redis.enabled -}}
{{- printf "%s-redis-master" (include "farm.fullname" .) -}}
{{- else -}}
{{- .Values.externalRedis.host -}}
{{- end -}}
{{- end }}

{{/*
Resolve the Redis port.
*/}}
{{- define "farm.redisPort" -}}
{{- if .Values.redis.enabled -}}
{{- print "6379" -}}
{{- else -}}
{{- .Values.externalRedis.port | toString -}}
{{- end -}}
{{- end }}

{{/*
Resolve the API internal URL for the Web service.
Auto-constructs the in-cluster URL when web.env.API_INTERNAL_URL is not set.
*/}}
{{- define "farm.apiInternalUrl" -}}
{{- if .Values.web.env.API_INTERNAL_URL -}}
{{- .Values.web.env.API_INTERNAL_URL -}}
{{- else -}}
{{- printf "http://%s-api:%d/api" (include "farm.fullname" .) (int .Values.api.service.port) -}}
{{- end -}}
{{- end }}

{{/*
Merged image pull secrets from global and workload-specific lists.
*/}}
{{- define "farm.api.imagePullSecrets" -}}
{{- $secrets := concat .Values.global.imagePullSecrets .Values.api.imagePullSecrets -}}
{{- if $secrets }}
imagePullSecrets:
{{- range $secrets }}
  {{- if kindIs "string" . }}
  - name: {{ . }}
  {{- else }}
  - name: {{ .name }}
  {{- end }}
{{- end }}
{{- end }}
{{- end }}

{{- define "farm.web.imagePullSecrets" -}}
{{- $secrets := concat .Values.global.imagePullSecrets .Values.web.imagePullSecrets -}}
{{- if $secrets }}
imagePullSecrets:
{{- range $secrets }}
  {{- if kindIs "string" . }}
  - name: {{ . }}
  {{- else }}
  - name: {{ .name }}
  {{- end }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Inject env entries for DATABASE_PASSWORD and REDIS_PASSWORD sourced from external
Kubernetes Secrets. Used when externalDatabase.existingSecret or externalRedis.existingSecret
is set and api.existingSecret is not (i.e., the chart manages the api Secret itself but the
DB/Redis password lives in a separate user-managed Secret).
*/}}
{{- define "farm.api.externalSecretEnv" -}}
{{- if and (not .Values.api.existingSecret) .Values.externalDatabase.existingSecret }}
- name: DATABASE_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ .Values.externalDatabase.existingSecret }}
      key: {{ .Values.externalDatabase.existingSecretKey }}
{{- end }}
{{- if and (not .Values.api.existingSecret) .Values.externalRedis.existingSecret }}
- name: REDIS_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ .Values.externalRedis.existingSecret }}
      key: {{ .Values.externalRedis.existingSecretKey }}
{{- end }}
{{- end }}
