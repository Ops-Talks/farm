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
  └─ Enqueues job: { runId, pipelineId } on PIPELINE_EXECUTION queue
        │
        ▼
PipelineProcessor.process()
  ├─ Sets run status → running
  ├─ Iterates stages in order (filters by order >= resumeFromStageOrder if resuming)
  │    ├─ Re-fetches run from DB — aborts if status === cancelled (race condition guard)
  │    ├─ Emits PIPELINE_LOG via EventsGateway
  │    ├─ Executes stage logic by type:
  │    │    ├─ script  → executes command
  │    │    ├─ approval → sets status=waiting_approval on run, stops processor
  │    │    ├─ deploy  → creates Deployment record
  │    │    └─ notify  → sends notification
  │    └─ Sets stageResult.status = succeeded / failed
  ├─ Sets run status → succeeded / failed
  └─ Emits PIPELINE_RUN_UPDATED via EventsGateway

POST /api/v1/pipelines/:id/runs/:runId/approve
  ├─ Validates run.status === waiting_approval
  ├─ Re-enqueues job: { runId, pipelineId, resumeFromStageOrder: N+1 }
  └─ Returns updated run (status: running)

POST /api/v1/pipelines/:id/runs/:runId/cancel
  ├─ Validates run.status in [queued, running, waiting_approval]
  ├─ Sets run.status = cancelled in DB
  └─ Processor detects cancelled status before next stage and aborts
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
| `FarmEvent.PIPELINE_RUN_UPDATED` | `pipeline.run.updated` | When a run changes status: `running`, `waiting_approval`, `succeeded`, or `failed` |

Both are defined in `packages/types/src/index.ts` and in `apps/api/src/common/events/events.interfaces.ts`.

!!! note "Rebuilding @farm/types after enum changes"
    After adding new values to the `PipelineRunStatus` enum (or any other export) in `packages/types/src/index.ts`, rebuild the package dist before linting or running the API:

    ```bash
    npm run build -w packages/types
    ```

    The `WAITING_APPROVAL` value was added in this way.

## Approval Gate Flow

When a pipeline has an `approval` stage:

1. Processor reaches the approval stage and sets `run.status = waiting_approval`.
2. Processor stops (does not continue to next stages).
3. `PIPELINE_RUN_UPDATED` WebSocket event is emitted with the updated run.
4. An admin calls `POST .../approve` or `POST .../reject`.
   - **Approve**: service re-enqueues the job with `resumeFromStageOrder = approvalStage.order + 1`. The processor will skip all stages before that order.
   - **Reject**: service sets `run.status = failed` directly; no re-queue.
5. On resume, the processor sets `run.status = running` and continues from the next stage.

## Cancel Race Condition Guard

The processor re-fetches the `PipelineRun` entity from the database at the beginning of each stage iteration. If the status is `cancelled`, the loop aborts immediately. This ensures that cancels triggered during execution take effect at the next stage boundary, even if the job is already processing.

## Cloud Deploy Executors

Deploy stages with `config.engine` set to a cloud engine value are dispatched to dedicated executor classes. The executor receives the stage config and a `logFn` callback for streaming output. Secret references in the config are resolved by `CloudSecretsService.resolveConfigSecrets` before the executor runs.

| `config.engine` | Executor class | Target |
|---|---|---|
| `helm` | `HelmDeployExecutor` | Kubernetes via Helm CLI |
| `aws-ecs` | `AwsEcsExecutor` | AWS ECS service update |
| `aws-lambda` | `AwsLambdaExecutor` | AWS Lambda function code update |
| `gcp-cloud-run` | `GcpCloudRunExecutor` | GCP Cloud Run service patch |
| `azure-container-apps` | `AzureContainerAppsExecutor` | Azure Container Apps patch |

All executors are injected as `@Optional()` dependencies in `PipelineProcessor`. Missing executors fall through to the simulated stage logic. See [Cloud Integrations](./cloud-integrations.md) for implementation details.

## Adding a New Stage Type
2. Add a handler branch in `PipelineProcessor.process()` for the new type
3. Document the `config` fields in `docs/api-reference/pipelines.md`
4. Add tests in `pipelines.service.spec.ts` for the new stage behavior

## Testing

- `PipelinesService` is tested with mock TypeORM repositories and a mock BullMQ queue (`{ add: jest.fn() }`)
- `PipelineProcessor` receives a mock `EventsGateway` and mock repository
- The queue is excluded in test environments (`NODE_ENV=test`) via the existing `QueuesModule.register()` guard
