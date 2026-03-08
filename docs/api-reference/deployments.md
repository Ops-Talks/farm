# Deployments API

The Deployments API provides endpoints for recording and tracking component deployments across environments.

For interactive documentation, including all available endpoints, data models, and request/response examples, please refer to the [Swagger UI](/api/docs).

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/deployments` | List deployments with optional filters | JWT |
| `GET` | `/api/deployments/matrix` | Get deployment matrix (latest version per component per environment) | JWT |
| `GET` | `/api/deployments/latest` | Get latest successful deployment per environment for a component | JWT |
| `GET` | `/api/deployments/:id` | Get a deployment by ID | JWT |
| `POST` | `/api/deployments` | Record a new deployment | JWT + Admin |
| `PATCH` | `/api/deployments/:id` | Update deployment status | JWT + Admin |

## Deployment Status

| Status | Description |
|--------|-------------|
| `pending` | Deployment has been created but not started |
| `in_progress` | Deployment is currently running |
| `succeeded` | Deployment completed successfully |
| `failed` | Deployment failed |
| `rolled_back` | Deployment was rolled back after success |

### Status Transitions

Deployment status follows a state machine with the following valid transitions:

```
pending -> in_progress, failed
in_progress -> succeeded, failed
succeeded -> rolled_back
failed -> pending (retry)
rolled_back -> pending (retry)
```

Invalid transitions will return a `400 Bad Request` error.

## Recording a Deployment

```bash
curl -X POST http://localhost:3000/api/deployments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "componentId": "550e8400-e29b-41d4-a716-446655440001",
    "environmentId": "550e8400-e29b-41d4-a716-446655440010",
    "version": "v2.3.1",
    "deployedBy": "ci-bot",
    "commitSha": "a1b2c3d4e5f6",
    "description": "Hotfix for login timeout issue",
    "metadata": {
      "pipelineUrl": "https://ci.example.com/runs/123"
    }
  }'
```

## Listing Deployments

Supports optional filters for `componentId`, `environmentId`, and `status`. All list results are paginated with `skip` and `take` query parameters (defaults: `skip=0`, `take=20`, max `take=100`).

```bash
# List all deployments with pagination
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/deployments?skip=0&take=20"

# Filter by component
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/deployments?componentId=<uuid>&skip=0&take=10"

# Filter by environment and status
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/deployments?environmentId=<uuid>&status=succeeded"
```

### Paginated Response (200)

```json
{
  "data": [
    {
      "id": "...",
      "componentId": "...",
      "environmentId": "...",
      "version": "v2.3.1",
      "status": "succeeded"
    }
  ],
  "total": 128,
  "skip": 0,
  "take": 20
}
```

## Deployment Matrix

Returns a dashboard-ready view showing the latest successful deployment for each component in each environment:

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/deployments/matrix
```

**Example response:**

```json
[
  {
    "componentId": "...",
    "componentName": "user-service",
    "environments": {
      "development": { "version": "v2.4.0", "deployedAt": "..." },
      "staging": { "version": "v2.3.1", "deployedAt": "..." },
      "production": { "version": "v2.3.0", "deployedAt": "..." }
    }
  }
]
```

## Latest Deployments

Returns the latest successful deployment for each environment of a given component:

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/deployments/latest?componentId=<uuid>"
```

## Updating Deployment Status

```bash
curl -X PATCH http://localhost:3000/api/deployments/{id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "status": "succeeded",
    "finishedAt": "2023-06-15T10:35:00Z"
  }'
```
