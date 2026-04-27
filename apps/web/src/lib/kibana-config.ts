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
 * Build a Kibana Discover deep link for a given index pattern.
 * Returns `undefined` when `NEXT_PUBLIC_KIBANA_URL` is not configured.
 */
export function buildKibanaDiscoverUrl(indexPattern: string): string | undefined {
  const base = getKibanaUrl();
  if (!base) return undefined;
  return `${base}/app/discover#/?_a=(index:'${encodeURIComponent(indexPattern)}')`;
}
