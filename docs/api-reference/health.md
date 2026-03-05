# Health API

The Health API provides an endpoint to check the status of the Farm application.

For interactive documentation, including all available endpoints, data models, and request/response examples, please refer to the [Swagger UI](/api/docs).

## Use Cases

### Health Checks

Use this endpoint for:

- Kubernetes liveness probes
- Load balancer health checks
- Monitoring systems
- Deployment verification

### Example: Kubernetes Probe Configuration

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 30
```
