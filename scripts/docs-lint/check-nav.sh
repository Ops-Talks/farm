#!/usr/bin/env bash
# check-nav.sh — Validate mkdocs.yml nav entries against filesystem
# Usage: bash scripts/docs-lint/check-nav.sh
# Exit 1 if any nav entry points to a missing file or any .md is orphaned.

set -euo pipefail

MKDOCS="mkdocs.yml"
DOCS_DIR="docs"
ERRORS=0

# Resolve a nav path relative to DOCS_DIR
# mkdocs.yml uses paths like "user-guide/iac.md" or "index.md"
resolve_path() {
    local entry="$1"
    # If path starts with http, skip (external link)
    if [[ "$entry" =~ ^https?:// ]]; then
        return 0
    fi
    # Remove any anchor (#section)
    entry="${entry%%#*}"
    [[ -z "$entry" ]] && return 0

    local full="$DOCS_DIR/$entry"
    if [[ ! -f "$full" ]]; then
        echo "ERROR: Nav entry '$entry' -> '$full' not found"
        return 1
    fi
    return 0
}

# Recursively extract nav paths from mkdocs.yml
# Handles nested structures: - Section: [sub-items]
extract_nav_entries() {
    yq eval '.nav[]' "$MKDOCS" 2>/dev/null | while IFS= read -r line; do
        echo "$line"
    done
}

echo "=== Checking nav entries exist ==="

# Use yq to extract nav paths. Format: items after colon in - Key: path
# This is a simplified parser; handles standard mkdocs.yml nav patterns.
NAV_PATHS=$(yq eval '.nav | .. | select(. == "*" and tag == "!!str") | .' "$MKDOCS" 2>/dev/null || true)

if [[ -z "$NAV_PATHS" ]]; then
    echo "WARNING: yq returned no nav entries. Trying python parser..."
    # Fallback: python-based parser
    NAV_PATHS=$(python3 -c "
import yaml, sys

# Handle custom YAML tags (e.g., !!python/name:...)
def noop_constructor(loader, tag_suffix, node):
    return None

yaml.SafeLoader.add_multi_constructor('tag:yaml.org,2002:python/name:', noop_constructor)
yaml.SafeLoader.add_multi_constructor('tag:yaml.org,2002:python/object:', noop_constructor)

with open('$MKDOCS') as f:
    data = yaml.safe_load(f)

def walk(items):
    paths = []
    if isinstance(items, list):
        for item in items:
            if isinstance(item, dict):
                for k, v in item.items():
                    if isinstance(v, str) and v.endswith('.md'):
                        paths.append(v)
                    elif isinstance(v, list):
                        paths.extend(walk(v))
            elif isinstance(item, str) and item.endswith('.md'):
                paths.append(item)
    elif isinstance(items, dict):
        for k, v in items.items():
            if isinstance(v, str) and v.endswith('.md'):
                paths.append(v)
            elif isinstance(v, list):
                paths.extend(walk(v))
    return paths

nav = data.get('nav', [])
for p in walk(nav):
    print(p)
" 2>/dev/null)
fi

if [[ -z "$NAV_PATHS" ]]; then
    echo "ERROR: Could not parse $MKDOCS nav. Is yq or PyYAML installed?"
    exit 1
fi

while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    # Skip external URLs and non-md entries
    if [[ "$path" =~ ^https?:// ]] || [[ ! "$path" =~ \.md$ ]]; then
        continue
    fi
    if ! resolve_path "$path"; then
        ERRORS=$((ERRORS + 1))
    fi
done <<< "$NAV_PATHS"

echo ""
echo "=== Checking for orphaned .md files ==="

# Build a set of all files referenced in nav
NAV_SET=$(mktemp)
while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    if [[ "$path" =~ ^https?:// ]] || [[ ! "$path" =~ \.md$ ]]; then
        continue
    fi
    path="${path%%#*}"
    echo "$DOCS_DIR/$path" >> "$NAV_SET"
done <<< "$NAV_PATHS"

# Find all .md files under DOCS_DIR and check if they're in nav
while IFS= read -r file; do
    # Normalize
    file=$(realpath --relative-to=. "$file")
    if ! grep -Fxq "$file" "$NAV_SET"; then
        # Skip index.md files that parent directories reference implicitly
        if [[ "$(basename "$file")" == "index.md" ]]; then
            continue
        fi
        echo "ORPHAN: '$file' is not in mkdocs.yml nav"
        ERRORS=$((ERRORS + 1))
    fi
done < <(find "$DOCS_DIR" -name '*.md' -not -path '*/node_modules/*')

rm -f "$NAV_SET"

echo ""
if [[ $ERRORS -gt 0 ]]; then
    echo "FAILED: $ERRORS issue(s) found"
    exit 1
else
    echo "OK: All nav entries valid, no orphans"
    exit 0
fi
