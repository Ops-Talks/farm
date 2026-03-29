# Incident Management

Farm provides a structured incident management workflow for tracking production issues from detection through resolution and post-mortem analysis. Incidents are scoped to an organization and can reference affected catalog components and environments.

## Core Concepts

### Incident

An incident represents a production issue that requires coordinated response. Each incident has a severity level, a status reflecting its lifecycle stage, and an optional incident commander responsible for coordination.

### Timeline

Every incident has a chronological timeline of updates. Timeline entries are created automatically on status changes and can be added manually by any team member. The timeline provides a complete audit trail of the incident response.

### Post-Mortem

After an incident is resolved, a post-mortem documents the root cause, contributing factors, and follow-up action items. Post-mortems require admin approval before they are considered finalized.

---

## Severity Levels

| Level | Label | Description |
|---|---|---|
| **P1** | Critical | Service outage affecting all users; requires immediate response |
| **P2** | High | Major functionality degraded; affects a significant portion of users |
| **P3** | Medium | Minor functionality impacted; workaround available |
| **P4** | Low | Cosmetic or minor issue; no significant user impact |

---

## Incident Lifecycle

Incidents progress through the following statuses:

```
open → investigating → identified → resolved
```

| Status | Description |
|---|---|
| `open` | Incident reported, not yet triaged |
| `investigating` | Team is actively investigating the cause |
| `identified` | Root cause has been identified |
| `resolved` | Incident has been resolved (terminal) |

**Allowed transitions:**

- `open` → `investigating`, `identified`, or `resolved`
- `investigating` → `identified` or `resolved`
- `identified` → `resolved`

Each status transition creates an automatic timeline entry.

---

## Managing Incidents

Navigate to **Incidents** in the sidebar to see all incidents.

### Creating an Incident

1. Click **Create Incident**.
2. Fill in the required fields:

| Field | Description |
|---|---|
| Title | Short summary (e.g., "Database outage in us-east-1") |
| Severity | `P1`, `P2`, `P3`, or `P4` |
| Description | Detailed description of the issue |
| Commander | Optional user responsible for coordination |
| Affected Components | Optional catalog components impacted |
| Affected Environments | Optional environments impacted |

3. Click **Create**. A WebSocket event (`incident.created`) is broadcast to all connected clients.

### Updating Status

Click the status transition buttons on the incident detail page. Each transition:

- Updates the incident status
- Creates a timeline entry with an optional message
- Broadcasts a WebSocket event (`incident.status-changed`)

### Adding Timeline Updates

On the incident detail page, use the timeline form to add manual updates. Each entry records:

- The update message
- The author (derived from your JWT token)
- A timestamp

### Filtering Incidents

Use the sidebar filters to narrow the incident list by:

- **Severity**: P1, P2, P3, P4
- **Status**: open, investigating, identified, resolved

---

## Post-Mortem Workflow

After resolving an incident, create a post-mortem to document lessons learned.

### Creating a Post-Mortem

1. On the incident detail page, click **Create Post-Mortem**.
2. Fill in:

| Field | Description |
|---|---|
| Root Cause | Analysis of the underlying cause |
| Contributing Factors | List of factors that contributed to the incident |
| Action Items | Follow-up tasks with assignees and completion status |
| Body | Full post-mortem write-up |

3. Click **Save**. The post-mortem is created in `draft` status.

### Approving a Post-Mortem

An admin reviews the post-mortem and clicks **Approve**. Approval records the approving user and timestamp. Only one post-mortem is allowed per incident.

---

## Real-Time Notifications

Farm broadcasts the following WebSocket events for incidents:

| Event | Trigger |
|---|---|
| `incident.created` | A new incident is created |
| `incident.status-changed` | An incident transitions to a new status |

These events appear as toast notifications in the web UI for all connected users.

---

## Best Practices

- **Assign an incident commander** for P1 and P2 incidents to ensure clear ownership.
- **Update the timeline frequently** during active incidents so stakeholders can follow progress without interrupting responders.
- **Link affected components and environments** to provide context and enable post-incident analysis of blast radius.
- **Write post-mortems for all P1 and P2 incidents.** Focus on systemic improvements rather than individual blame.

---

## Related

- [Incident API Reference](../api-reference/incidents.md) for endpoint details and response schemas.
- [SLO Management](slos.md) for tracking reliability targets that may trigger incidents.
- [Observability](observability.md) for metrics, traces, and alerting rules.
