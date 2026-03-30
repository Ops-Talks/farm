# Environment Requests

Environment Requests provide a self-service workflow for provisioning deployment environments. Developers request the environment they need, administrators review and approve, and Farm tracks the full lifecycle from creation through expiry.

## Core Concepts

### Environment Request

An environment request is a formal submission to create a new deployment environment. It captures the desired configuration (type, tier, TTL) and moves through an approval workflow before provisioning begins.

### Ephemeral vs Persistent

Ephemeral environments are short-lived and include a time-to-live (TTL) after which they are automatically torn down. Use ephemeral environments for feature previews, pull request testing, and time-boxed experiments. Persistent environments remain available until manually removed and are suited for shared staging or long-running integration testing.

### Environment Tier

Tiers control the resource allocation for the provisioned environment:

| Tier   | CPU   | Memory | Use Case                             |
|--------|-------|--------|--------------------------------------|
| Small  | 0.5   | 512 MB | Lightweight smoke tests              |
| Medium | 2     | 2 GB   | Integration and functional testing   |
| Large  | 4     | 8 GB   | Performance and load testing         |

### Time to Live (TTL)

TTL defines how long an ephemeral environment remains active after provisioning completes. When the TTL expires, the environment transitions to `expired` and its resources are reclaimed. Persistent environments do not require a TTL.

---

## Requesting a New Environment

### Step 1: Open the Request Form

Navigate to **Environment Requests** in the sidebar and click **New Request**.

### Step 2: Fill in Request Details

| Field | Description |
|---|---|
| Name | A descriptive name (e.g., `feature-xyz-preview`) |
| Description | Justification for why the environment is needed |
| Type | `ephemeral` for short-lived or `persistent` for long-lived |
| Tier | Resource tier: `small`, `medium`, or `large` |
| TTL (hours) | How long the environment should remain active (ephemeral only) |
| Component | Optional link to the catalog component this environment serves |

### Step 3: Submit

Click **Submit Request**. The request enters `pending` status and is visible to administrators for review.

---

## Approval Workflow

Environment requests follow a defined state machine:

```
pending --> approved --> provisioning --> active --> expired
  |
  +--> rejected
```

### Status Descriptions

| Status         | Description                                                  |
|----------------|--------------------------------------------------------------|
| **Pending**    | Request submitted and awaiting administrator review          |
| **Approved**   | Administrator approved the request; provisioning will begin  |
| **Rejected**   | Administrator rejected the request with a reason             |
| **Provisioning** | Environment resources are being created                   |
| **Active**     | Environment is running and available for use                 |
| **Expired**    | Environment has been torn down (TTL elapsed or manual expiry)|

### For Administrators

- Navigate to the pending requests queue to review incoming requests.
- Click **Approve** to authorize provisioning. Add an optional comment.
- Click **Reject** to deny the request. Provide a reason so the requester understands why.
- For active environments that need early termination, click **Expire** to reclaim resources.

---

## Monitoring Environment Status

The Environment Requests dashboard shows all requests grouped by status. Each request card displays:

- Environment name and description
- Type and tier badges
- Current status with timestamp
- TTL countdown for active ephemeral environments
- Linked component (if any)
- Reviewer name and comment (after review)

Click any request to view full details, including the status history and provisioning logs.

---

## Updating a Pending Request

While a request is still in `pending` status, you can update the name, description, and TTL. Navigate to the request detail page and click **Edit**. Once a request has been approved or rejected, it can no longer be modified.

---

## Best Practices

- **Use ephemeral environments for feature work.** Set a TTL that matches your development cycle (24-72 hours) to avoid resource waste.
- **Choose the smallest tier that meets your needs.** Start with `small` for smoke tests and scale up only when required for integration or load testing.
- **Write clear descriptions.** Help administrators understand why the environment is needed so they can approve quickly.
- **Link requests to components.** Associating a request with a catalog component provides context and improves traceability.
- **Monitor TTL expiry.** Plan your testing around the TTL window. If you need more time, update the request before it expires.
- **Clean up persistent environments.** Since persistent environments do not auto-expire, coordinate with your team to remove them when no longer needed.

---

## Related

- [Environment Requests API Reference](../api-reference/environment-requests.md) for endpoint details and response schemas.
- [Service Templates](service-templates.md) for scaffolding services to deploy into requested environments.
- [Catalog](catalog.md) for managing the components linked to environment requests.
