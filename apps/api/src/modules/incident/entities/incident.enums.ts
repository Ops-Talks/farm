/**
 * Severity levels for incidents, following PagerDuty-style priority naming.
 */
export enum IncidentSeverity {
  P1 = "P1",
  P2 = "P2",
  P3 = "P3",
  P4 = "P4",
}

/**
 * Lifecycle statuses an incident progresses through.
 */
export enum IncidentStatus {
  OPEN = "open",
  INVESTIGATING = "investigating",
  IDENTIFIED = "identified",
  RESOLVED = "resolved",
}
