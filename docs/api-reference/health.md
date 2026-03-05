# Health API

The Health API provides an endpoint to check the status of the Farm application, including its dependencies and system resources.

For interactive documentation, including the full JSON response schema, please refer to the [Swagger UI](/api/docs).

## Advanced Monitoring

The `/api/health` endpoint performs the following checks:

- **Database**: Verifies connectivity with the PostgreSQL database.
- **Memory (Heap)**: Ensures heap memory usage is within safe limits (150MB).
- **Memory (RSS)**: Ensures Resident Set Size memory usage is within safe limits (300MB).
- **Disk Storage**: Verifies that disk usage on the root partition is below 90%.
- **Version**: Returns the current application version.

## Use Cases

### Health Checks

Use this endpoint for:

- **Kubernetes Liveness/Readiness Probes**: The endpoint returns a `503 Service Unavailable` status if any check fails.
- **Monitoring Dashboards**: Integrate with Grafana or Prometheus to track resource health.
- **Deployment Verification**: Confirm that both the API and Database are ready after a rollout.

### Example: Kubernetes Probe Configuration

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 15
  periodSeconds: 30
  failureThreshold: 3
```
