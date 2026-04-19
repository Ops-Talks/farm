/**
 * Normalizes a full Git ref into a short branch or tag name suitable for
 * `git clone --branch`. GitHub webhook payloads send full refs such as
 * `refs/heads/main` or `refs/tags/v1.2.0`, but `--branch` expects a bare
 * branch or tag name.
 *
 * Examples:
 *   refs/heads/main   -> main
 *   refs/tags/v1.2.0  -> v1.2.0
 *   main              -> main (already short)
 *
 * @param ref - Full or short Git ref string
 * @returns Short branch or tag name
 */
export function normalizeRef(ref: string): string {
  return ref.replace(/^refs\/heads\//, "").replace(/^refs\/tags\//, "");
}
