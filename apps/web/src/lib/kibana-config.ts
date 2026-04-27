/**
 * Client-side configuration accessor for Kibana deep-linking.
 *
 * Wrapping `process.env.NEXT_PUBLIC_KIBANA_URL` in a function call lets
 * tests mock this module to toggle the value per-test without relying on
 * mutating `process.env` (which Next.js inlines at build time and is
 * unreliable to change at runtime).
 */
export function getKibanaUrl(): string | undefined {
  const value = process.env.NEXT_PUBLIC_KIBANA_URL;
  if (!value || value.trim() === "") {
    return undefined;
  }
  return value.replace(/\/+$/, "");
}

/**
 * Escape a value for safe interpolation inside a single-quoted Rison string.
 *
 * In Rison's single-quoted strings, `!` is the escape character: `!!` is a
 * literal `!` and `!'` is a literal `'`. Backslash has no special meaning in
 * Rison strings, so it does not need escaping.
 *
 * `encodeURIComponent()` does not escape `'` or `!`, so without this step an
 * index pattern containing those characters could otherwise terminate the
 * Rison string prematurely or be misinterpreted by Kibana's Rison parser.
 *
 * Replacement order matters: `!` must be doubled before `'` is rewritten to
 * `!'`, otherwise the inserted `!` would itself be re-escaped.
 */
function escapeRisonString(value: string): string {
  return value.replace(/!/g, "!!").replace(/'/g, "!'");
}

/**
 * Build a Kibana Discover deep link for a given index pattern.
 * Returns `undefined` when `NEXT_PUBLIC_KIBANA_URL` is not configured.
 *
 * The pattern is Rison-escaped (single-quoted Rison string) and then
 * URI-encoded, so values containing `'`, `!`, `*`, `\\`, or other special
 * characters cannot break out of the `_a` state object or alter the URL.
 */
export function buildKibanaDiscoverUrl(indexPattern: string): string | undefined {
  const base = getKibanaUrl();
  if (!base) return undefined;
  const safe = encodeURIComponent(escapeRisonString(indexPattern));
  return `${base}/app/discover#/?_a=(index:'${safe}')`;
}
