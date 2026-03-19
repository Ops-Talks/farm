# CI/CD Integrations API

The CI/CD Integrations API connects Farm to external CI/CD platforms (ArgoCD, CircleCI, Jenkins, Travis CI), manages per-organization credentials, and receives webhook events from each platform.

## Base Paths

| Base Path | Platform |
|-----------|---------|
| `/api/v1/integrations/credentials` | Integration credential management |
| `/api/v1/argocd` | ArgoCD GitOps CD |
| `/api/v1/circleci` | CircleCI CI/CD |
| `/api/v1/jenkins` | Jenkins CI/CD |
| `/api/v1/travisci` | Travis CI |
| `/api/v1/webhooks` | Inbound webhook receivers |

## Prerequisites

Connect each platform by creating an `IntegrationCredential` record for your organization before using the platform-specific endpoints. All platform API calls use the stored credential — no environment variables required.

---

## Integration Credentials

### Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/integrations/credentials` | List credentials for the current org | JWT |
| `POST` | `/api/v1/integrations/credentials` | Create a new credential | JWT + Admin |
| `PATCH` | `/api/v1/integrations/credentials/:id` | Update a credential | JWT + Admin |
| `DELETE` | `/api/v1/integrations/credentials/:id` | Delete a credential | JWT + Admin |

### Credential Types

| Type | Required Fields | Description |
|------|----------------|-------------|
| `argocd` | `url`, `token` | ArgoCD instance URL and API token |
| `circleci` | `token` | CircleCI personal API token |
| `jenkins` | `url`, `username`, `apiToken` | Jenkins instance URL with Basic Auth |
| `travisci` | `token`, optional `url` | Travis CI API token (url for self-hosted) |

### Create Credential

```http
POST /api/v1/integrations/credentials
Content-Type: application/json
Authorization: Bearer <token>

{
  "type": "argocd",
  "name": "Production ArgoCD",
  "value": {
    "url": "https://argocd.example.com",
    "token": "eyJhbGciOi..."
  }
}
```

The `value` object is encrypted with AES-256-GCM before storage. The key is derived from `JWT_SECRET`. Decrypted values are never returned in API responses.

### Response (201)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "type": "argocd",
  "name": "Production ArgoCD",
  "orgId": null,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

---

## ArgoCD

### Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/argocd/applications` | List all ArgoCD Applications | JWT |
| `GET` | `/api/v1/argocd/applications/:name` | Get a specific Application | JWT |
| `POST` | `/api/v1/argocd/applications/:name/sync` | Trigger Application sync | JWT + Admin |

### List Applications

```http
GET /api/v1/argocd/applications
Authorization: Bearer <token>
```

Returns an empty array when no ArgoCD credential is configured.

### Response (200)

```json
[
  {
    "metadata": { "name": "my-service", "namespace": "argocd" },
    "spec": {
      "source": { "repoURL": "https://github.com/org/my-service", "targetRevision": "main" },
      "destination": { "server": "https://kubernetes.default.svc", "namespace": "production" }
    },
    "status": {
      "health": { "status": "Healthy" },
      "sync": { "status": "Synced" },
      "operationState": { "finishedAt": "2025-01-01T00:00:00.000Z" }
    }
  }
]
```

### Health Status Values

| Status | Meaning |
|--------|---------|
| `Healthy` | All resources are running correctly |
| `Progressing` | Resources are being updated |
| `Degraded` | One or more resources are failing |
| `Suspended` | Application is suspended |
| `Unknown` | Status cannot be determined |

### Sync Status Values

| Status | Meaning |
|--------|---------|
| `Synced` | Live state matches desired state |
| `OutOfSync` | Live state differs from desired state |
| `Unknown` | Sync status cannot be determined |

### Component Integration

Set the `argocdApp` field on a Catalog component to link it to an ArgoCD Application name. The CI/CD tab on the component detail page will then show the real-time health and sync status.

```http
PATCH /api/v1/catalog/components/:id
Content-Type: application/json
Authorization: Bearer <token>

{ "argocdApp": "my-service" }
```

---

## CircleCI

### Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/circleci/pipelines` | List CircleCI pipelines | JWT |
| `POST` | `/api/v1/circleci/pipelines/:slug/trigger` | Trigger a pipeline | JWT + Admin |

### List Pipelines

```http
GET /api/v1/circleci/pipelines?vcsUrl=https://github.com/org/repo
Authorization: Bearer <token>
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `vcsUrl` | string | No | Filter pipelines by VCS repository URL |

### Trigger Pipeline

```http
POST /api/v1/circleci/pipelines/gh%2Forg%2Frepo/trigger
Authorization: Bearer <token>
```

The `:slug` is URL-encoded in the form `gh/org/repo` (GitHub) or `bb/org/repo` (Bitbucket).

---

## Jenkins

### Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/jenkins/jobs` | List all Jenkins jobs | JWT |
| `GET` | `/api/v1/jenkins/jobs/:name/builds` | List build history for a job | JWT |
| `POST` | `/api/v1/jenkins/jobs/:name/build` | Trigger a build | JWT + Admin |

### List Jobs

Returns all Jenkins jobs with their last build result.

```http
GET /api/v1/jenkins/jobs
Authorization: Bearer <token>
```

### Response (200)

```json
[
  {
    "name": "my-service-build",
    "url": "https://jenkins.example.com/job/my-service-build/",
    "color": "blue",
    "lastBuild": {
      "number": 42,
      "result": "SUCCESS",
      "timestamp": 1735689600000,
      "duration": 120000
    }
  }
]
```

### Build Result Values

| Result | Color | Meaning |
|--------|-------|---------|
| `SUCCESS` | `blue` | Build passed |
| `FAILURE` | `red` | Build failed |
| `UNSTABLE` | `yellow` | Build passed with test failures |
| `ABORTED` | `aborted` | Build was manually aborted |
| `null` | `anime` | Build is currently running |

---

## Travis CI

### Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v1/travisci/builds` | List Travis CI builds | JWT |
| `POST` | `/api/v1/travisci/builds/:id/restart` | Restart a build | JWT + Admin |

### List Builds

```http
GET /api/v1/travisci/builds?repoSlug=org%2Frepo
Authorization: Bearer <token>
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `repoSlug` | string | No | Filter builds by repository slug (`org/repo`) |

### Build State Values

| State | Meaning |
|-------|---------|
| `passed` | Build succeeded |
| `failed` | Build failed |
| `errored` | Build errored (infrastructure issue) |
| `canceled` | Build was canceled |
| `started` | Build is currently running |
| `created` | Build is queued |

---

## Webhook Receivers

Farm registers inbound webhook endpoints for each CI/CD platform. When a build completes or changes status, the platform sends a `POST` to Farm, which emits a `ci.build.updated` WebSocket event to all connected frontend clients.

| Method | Path | Platform | Verification |
|--------|------|---------|-------------|
| `POST` | `/api/v1/webhooks/circleci` | CircleCI | HMAC-SHA256 signature header |
| `POST` | `/api/v1/webhooks/jenkins` | Jenkins | Generic Webhook Trigger plugin |
| `POST` | `/api/v1/webhooks/travisci` | Travis CI | Configurable webhook URL |

All webhook endpoints return `200 OK` immediately. Processing is asynchronous via `EventEmitter2`.

### CircleCI Webhook Setup

In CircleCI project settings, add a webhook pointing to `https://your-farm-instance.com/api/v1/webhooks/circleci`. Farm verifies the request using the HMAC-SHA256 `circleci-signature` header.

### Jenkins Webhook Setup

Install the [Generic Webhook Trigger plugin](https://plugins.jenkins.io/generic-webhook-trigger/) in Jenkins. Configure it to `POST` to `https://your-farm-instance.com/api/v1/webhooks/jenkins`.

### Travis CI Webhook Setup

In your `.travis.yml`, add:

```yaml
notifications:
  webhooks:
    urls:
      - https://your-farm-instance.com/api/v1/webhooks/travisci
    on_success: always
    on_failure: always
```

---

## Pipeline Build Stage

Farm pipelines support an OCI image `build` stage type that runs `docker`, `buildah`, or `podman` on the Farm API server.

### Stage Configuration

```json
{
  "name": "Build Docker Image",
  "type": "build",
  "config": {
    "engine": "docker",
    "dockerfile": "Dockerfile",
    "context": ".",
    "tag": "my-org/my-service:{{version}}-{{commitSha}}",
    "push": true,
    "registry": "registry.example.com"
  }
}
```

### Config Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `engine` | `docker` \| `buildah` \| `podman` | `docker` | OCI build engine |
| `dockerfile` | string | `Dockerfile` | Path to the Dockerfile |
| `context` | string | `.` | Build context directory |
| `tag` | string | — | Image tag template (required) |
| `push` | boolean | `false` | Push image to registry after build |
| `registry` | string | — | Registry URL (required when `push: true`) |

### Tag Templates

| Variable | Resolves to |
|----------|-------------|
| `{{version}}` | Pipeline trigger version |
| `{{commitSha}}` | 7-character short Git commit SHA |

The build engine binary must be available in the Farm API server's `PATH`. The stage fails gracefully with a descriptive error message when the engine is not found.
