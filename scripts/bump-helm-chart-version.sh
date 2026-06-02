#!/usr/bin/env bash
# Bumps the patch segment of the `version:` field in a Helm Chart.yaml file.
# Usage: bump-helm-chart-version.sh <path-to-Chart.yaml>
#
# The script validates that the current version matches semver x.y.z before
# touching the file. Minor and major bumps must be performed manually.
set -euo pipefail

CHART_FILE="${1:-}"

if [[ -z "${CHART_FILE}" ]]; then
  echo "Usage: $0 <path-to-Chart.yaml>" >&2
  exit 1
fi

if [[ ! -f "${CHART_FILE}" ]]; then
  echo "Error: file not found: ${CHART_FILE}" >&2
  exit 1
fi

CURRENT=$(grep -E '^version:' "${CHART_FILE}" | head -1 | sed 's/^version:[[:space:]]*//')

if [[ ! "${CURRENT}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: current chart version '${CURRENT}' in ${CHART_FILE} does not match x.y.z semver." >&2
  echo "Automated bump only supports clean x.y.z versions. Bump manually for pre-release or RC tags." >&2
  exit 1
fi

IFS='.' read -r MAJOR MINOR PATCH <<< "${CURRENT}"
NEXT_PATCH=$(( PATCH + 1 ))
NEW_VERSION="${MAJOR}.${MINOR}.${NEXT_PATCH}"

sed -i "s/^version: .*/version: ${NEW_VERSION}/" "${CHART_FILE}"

echo "Bumped chart version in ${CHART_FILE}: ${CURRENT} -> ${NEW_VERSION}"
