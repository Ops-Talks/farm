# WebSocket Real-Time Events

Farm provides a WebSocket gateway for broadcasting real-time events when catalog components or deployments change. The gateway uses [Socket.IO](https://socket.io/) over the `/events` namespace.

## Connecting

Clients authenticate via JWT token passed in the Socket.IO handshake:

```javascript
import { io } from "socket.io-client";

const socket = io("ws://localhost:3000/events", {
  auth: {
    token: "<your-jwt-token>",
  },
});

socket.on("connect", () => {
  console.log("Connected to Farm events");
});

socket.on("disconnect", () => {
  console.log("Disconnected from Farm events");
});
```

Alternatively, the token can be passed as a query parameter:

```javascript
const socket = io("ws://localhost:3000/events?token=<your-jwt-token>");
```

Connections without a valid JWT are rejected immediately.

## Available Events

### Catalog Events

| Event | Trigger | Payload |
|---|---|---|
| `component.created` | New component added to catalog | `{ id, name, kind, owner, timestamp }` |
| `component.updated` | Existing component modified | `{ id, name, kind, owner, timestamp }` |
| `component.deleted` | Component removed from catalog | `{ id, name, timestamp }` |

### Deployment Events

| Event | Trigger | Payload |
|---|---|---|
| `deployment.created` | New deployment initiated | `{ id, componentId, environmentId, version, status, timestamp }` |
| `deployment.updated` | Deployment status changed | `{ id, componentId, environmentId, version, status, timestamp }` |

## Example: Listening to Events

```javascript
// Catalog events
socket.on("component.created", (data) => {
  console.log(`New component: ${data.name} (${data.kind})`);
});

socket.on("component.updated", (data) => {
  console.log(`Component updated: ${data.name}`);
});

socket.on("component.deleted", (data) => {
  console.log(`Component deleted: ${data.name}`);
});

// Deployment events
socket.on("deployment.created", (data) => {
  console.log(`Deployment started: ${data.version} -> env ${data.environmentId}`);
});

socket.on("deployment.updated", (data) => {
  console.log(`Deployment ${data.id} status: ${data.status}`);
});
```

## Architecture

The `EventsGateway` is a global NestJS provider. When services (CatalogService, DeploymentsService) perform write operations, they emit events through the gateway to all connected clients. The gateway uses its own JwtModule instance for token verification during the handshake.

```
Client (Socket.IO) --[JWT handshake]--> EventsGateway (/events namespace)
                                            ^
CatalogService.create()  ---- emits -------+
DeploymentsService.update() -- emits ------+
```
