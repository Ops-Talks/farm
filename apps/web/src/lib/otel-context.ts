/**
 * User context helpers for OpenTelemetry.
 *
 * Stores the current authenticated user and selected organisation in
 * module-level state so that every span helper in `otel-spans.ts` can
 * include user identity attributes without having to thread them through
 * every call-site manually.
 *
 * Additionally, `setUserContext` sets the attributes on whatever span is
 * currently active (if any), which is useful for propagating identity into
 * long-lived request spans.
 *
 * Usage:
 *   // After login:
 *   setUserContext(user.id, user.username, org.id);
 *
 *   // After org switch:
 *   setUserContext(user.id, user.username, newOrg.id);
 *
 *   // On logout:
 *   clearUserContext();
 */

import { trace } from '@opentelemetry/api';

/** Shape of the stored user context. */
export interface UserContext {
  userId: string;
  username: string;
  orgId?: string;
}

/** Module-level store — survives across renders within the same page load. */
let _ctx: UserContext | null = null;

/**
 * Persists user identity in module state and sets the attributes on the
 * currently active OTel span (if one exists).
 *
 * Attribute keys follow OpenTelemetry semantic conventions:
 *   - `user.id`   — stable, opaque user identifier
 *   - `user.name` — human-readable username
 *   - `org.id`    — identifier of the selected organisation (optional)
 */
export function setUserContext(
  userId: string,
  username: string,
  orgId?: string,
): void {
  _ctx = { userId, username, orgId };

  // Attach user identity to whatever span is currently active.  In practice
  // this enriches the page-load or navigation span that wraps the login flow.
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    activeSpan.setAttribute('user.id', userId);
    activeSpan.setAttribute('user.name', username);
    if (orgId) {
      activeSpan.setAttribute('org.id', orgId);
    }
  }
}

/**
 * Removes the stored user context.  Call on logout so that subsequent spans
 * (e.g. a new login attempt) do not carry stale identity attributes.
 */
export function clearUserContext(): void {
  _ctx = null;
}

/**
 * Returns a snapshot of the current user context, or `null` if no user is
 * logged in.  Used by span helpers that want to enrich spans with identity.
 */
export function getUserContext(): UserContext | null {
  return _ctx ? { ..._ctx } : null;
}
