# Health API

The Health API provides an endpoint to check the status of the Farm application.

## Endpoints

### Check Health

Check if the application is running and healthy.

```
GET /api/health
```

#### Request

No request body required.

#### Response

**Status Code**: 200 OK

**Response Body**:

```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

| Field | Type | Description |
|-------|------|-------------|
| status | string | Current health status, always "ok" if responding |
| version | string | Application version from package.json |

#### Example

```bash
curl http://localhost:3000/api/health
```

Response:

```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

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
