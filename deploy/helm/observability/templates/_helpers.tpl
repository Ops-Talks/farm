{{/*
Expand the name of the chart.
*/}}
{{- define "farm-observability.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
Truncated at 63 characters because Kubernetes DNS naming rules require it.
*/}}
{{- define "farm-observability.fullname" -}}
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
{{- define "farm-observability.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Selector labels — stable subset safe for use in selector.matchLabels.
Never change these after the initial release: selector fields are immutable
in Kubernetes once the resource is created.
*/}}
{{- define "farm-observability.selectorLabels" -}}
app.kubernetes.io/name: {{ include "farm-observability.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Common labels applied to all resources managed by this chart.
*/}}
{{- define "farm-observability.labels" -}}
helm.sh/chart: {{ include "farm-observability.chart" . }}
{{ include "farm-observability.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: farm
{{- end }}
