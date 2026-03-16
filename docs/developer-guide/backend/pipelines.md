# Pipeline Architecture

This document describes the internal design of the Farm pipeline system for contributors and developers extending the platform.

## Module Location

```
apps/api/src/modules/pipelines/
  entities/
    pipeline.entity.ts          — Pipeline definition
    pipeline-run.entity.ts      — Execution record
  dto/
    create-pipeline.dto.ts
    update-pipeline.dto.ts
    trigger-pipeline.dto.ts
    list-pipelines-query.dto.ts
  pipeline.processor.ts         — BullMQ worker
  pipelines.service.ts
  pipelines.controller.ts
  pipelines.module.ts
  pipelines.service.spec.ts
  pipelines.controller.spec.ts
```

## Execution Flow

```
POST /api/v1/pipelines/:id/trigger
        │
        ▼
PipelinesService.triggerRun()
  ├─ Creates PipelineRun (status: queued)
  └─ Enqueues job on pipeline-execution queue (BullMQ)
        │
        ▼
PipelineProcessor.process()
  ├─ Sets run status → running
  ├─ Iterates stages in order
  │    ├─ Emits PIPELINE_LOG via EventsGateway (WebSocket)
  │    ├─ Executes stage logic
  │    ├─ If type=approval → sets stageResult.status=waiting_approval, stops
  │    └─ Otherwise → sets stageResult.status=succeeded
  ├─ Sets run status → succeeded / failed
  └─ Emits PIPELINE_RUN_UPDATED via EventsGateway (WebSocket)
```

## Data Model

### Pipeline

The `stages` field is stored as `simple-json` — a JSON-serialised array of `PipelineStage` objects. This avoids a separate stages table while keeping the structure flexible.

```typescript
interface PipelineStage {
  id: string;
  name: string;
  type: 'script' | 'approval' | 'deploy' | 'notify';
  config: Record<string, unknown>;
  order: number;
}
```

### PipelineRun

- `stageResults` — JSON array updated in-place as each stage executes
- `logs` — plain-text string appended during execution
- `ON DELETE CASCADE` from `Pipeline` — deleting a pipeline removes all its runs

## BullMQ Integration

The queue name `PIPELINE_EXECUTION` is registered in:

1. `apps/api/src/common/queues/queue-names.ts` — constant definition
2. `QueuesModule.register()` — `BullModule.registerQueue()` + Bull Board UI adapter
3. `PipelinesModule` — `BullModule.registerQueue()` for local use by `PipelinesService` and `PipelineProcessor`

The processor is provided in `PipelinesModule` and injected with `EventsGateway` (available globally via `EventsModule`).

## WebSocket Events

Two events are emitted on the `/events` Socket.IO namespace:

| Constant | Value | When emitted |
|----------|-------|-------------|
| `FarmEvent.PIPELINE_LOG` | `pipeline.log` | Once per stage, during execution |
| `FarmEvent.PIPELINE_RUN_UPDATED` | `pipeline.run.updated` | On run completion (succeeded or failed) |

Both are defined in `packages/types/src/index.ts` and in `apps/api/src/common/events/events.interfaces.ts`.

## Adding a New Stage Type

1. Add the new type string to the `PipelineStage.type` union in `pipeline.entity.ts`
2. Add a handler branch in `PipelineProcessor.process()` for the new type
3. Document the `config` fields in `docs/api-reference/pipelines.md`
4. Add tests in `pipelines.service.spec.ts` for the new stage behavior

## Testing

- `PipelinesService` is tested with mock TypeORM repositories and a mock BullMQ queue (`{ add: jest.fn() }`)
- `PipelineProcessor` receives a mock `EventsGateway` and mock repository
- The queue is excluded in test environments (`NODE_ENV=test`) via the existing `QueuesModule.register()` guard
