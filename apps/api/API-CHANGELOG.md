# API Changelog

Documents breaking and notable changes to the Farm API per version.

## v1 (current)

All endpoints are available under the `/api/v1` prefix.

### Migration from unversioned `/api`

Prior to v1, all endpoints were served directly under `/api/{resource}`.
Clients still using the unversioned prefix receive a `308 Permanent Redirect`
to the equivalent `/api/v1/{resource}` endpoint with a `Deprecation: true`
response header.

Update your base URL from:

```
https://your-farm-host/api
```

to:

```
https://your-farm-host/api/v1
```

### Endpoints

All resource endpoints follow the pattern `GET|POST|PATCH|DELETE /api/v1/{resource}`.
See the full OpenAPI specification at `/api/docs` or `apps/api/openapi.json`.
