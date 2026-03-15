# Background Job Processing

Farm uses [BullMQ](https://docs.bullmq.io/) with Redis for asynchronous background job processing. This allows long-running or non-critical operations to run outside the HTTP request cycle.

## Available Queues

| Queue Name | Purpose | Processor |
|---|---|---|
| `catalog-discovery` | Async YAML catalog ingestion from git repositories | `CatalogDiscoveryProcessor` |
| `notifications` | Email and webhook notification delivery (placeholder) | `NotificationProcessor` |

## How It Works

When a user calls `POST /api/v1/catalog/locations` to discover components from a git repository, the request is enqueued as a BullMQ job rather than processed synchronously. The `CatalogDiscoveryProcessor` picks up the job in the background, clones the repository, finds `catalog-info.yaml` files, and registers them.

If Redis is unavailable, the system falls back to synchronous processing automatically.

## Configuration

BullMQ connects to the same Redis instance used for caching. Configuration is via environment variables:

| Variable | Default | Description |
|---|---|---|
| `REDIS_HOST` | `localhost` | Redis server hostname |
| `REDIS_PORT` | `6379` | Redis server port |

In **test mode** (`NODE_ENV=test`), BullMQ is completely disabled to avoid Redis connection issues during testing. The `QueuesModule` returns an empty module in this case.

## Bull Board Dashboard

Farm includes [Bull Board](https://github.com/felixmosh/bull-board), a web-based UI for monitoring and managing BullMQ queues.

**URL:** `http://localhost:3000/api/admin/queues`

The dashboard allows you to:

- View pending, active, completed, and failed jobs
- Inspect job data and error stack traces
- Retry or remove failed jobs
- Monitor queue throughput in real time

## Adding a New Queue

1. Define the queue name and job data interface in your processor file:

```typescript
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";

export const MY_QUEUE = "my-queue";

export interface MyJobData {
  someField: string;
}

@Processor(MY_QUEUE)
export class MyProcessor extends WorkerHost {
  async process(job: Job<MyJobData>): Promise<void> {
    // Process the job
  }
}
```

2. Register the queue in `QueuesModule` (`apps/api/src/common/queues/queues.module.ts`):

```typescript
BullModule.registerQueue(
  { name: CATALOG_DISCOVERY_QUEUE },
  { name: NOTIFICATIONS_QUEUE },
  { name: MY_QUEUE },  // add here
),
```

3. Add the processor to the module's providers and register it with Bull Board.

4. Inject the queue in your service:

```typescript
constructor(
  @Optional() @InjectQueue(MY_QUEUE) private readonly myQueue?: Queue,
) {}

async enqueueWork(data: MyJobData): Promise<void> {
  await this.myQueue?.add("job-name", data);
}
```

## Architecture

```
HTTP Request --> Controller --> Queue.add(job)
                                    |
                          Redis (BullMQ broker)
                                    |
                              Processor.process(job) --> Service logic
```

The queue acts as a buffer between the HTTP layer and the processing logic. This provides:

- **Non-blocking responses**: The API returns immediately with a job ID
- **Retry logic**: Failed jobs can be retried automatically
- **Concurrency control**: Limit how many jobs run in parallel
- **Visibility**: Bull Board shows job status and errors
