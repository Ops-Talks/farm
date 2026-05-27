import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Job } from "bullmq";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
import { EventsGateway } from "../../common/events/events.gateway";
import {
  FarmEvent,
  PipelineStageUpdatedPayload,
} from "../../common/events/events.interfaces";
import {
  PipelineRun,
  PipelineRunStatus,
  StageResult,
} from "./entities/pipeline-run.entity";
import { Pipeline } from "./entities/pipeline.entity";
import {
  HelmDeployExecutor,
  HelmDeployConfig,
} from "../helm/helm-deploy.executor";
import { BuildStageExecutor } from "./build-stage.executor";
import { InfracostStageExecutor } from "./infracost-stage.executor";
import {
  AwsEcsExecutor,
  AwsEcsDeployConfig,
} from "../cloud/executors/aws-ecs.executor";
import {
  AwsLambdaExecutor,
  AwsLambdaDeployConfig,
} from "../cloud/executors/aws-lambda.executor";
import {
  GcpCloudRunExecutor,
  GcpCloudRunDeployConfig,
} from "../cloud/executors/gcp-cloud-run.executor";
import {
  AzureContainerAppsExecutor,
  AzureContainerAppsDeployConfig,
} from "../cloud/executors/azure-container-apps.executor";
import { CloudSecretsService } from "../cloud/cloud-secrets.service";
import {
  IntegrationCredential,
  IntegrationType,
} from "../integrations/entities/integration-credential.entity";
import { GitHubActionsService } from "../integrations/github-actions.service";
import { ArgoCDService } from "../integrations/argocd.service";
import { DeploymentsService } from "../environments/deployments.service";
import * as crypto from "crypto";

/**
 * Cached token entry used by the Keycloak secret resolver.
 */
interface CachedToken {
  token: string;
  /** Unix timestamp (ms) after which the token must be refreshed. */
  expiresAt: number;
}

/**
 * Token response from a Keycloak token endpoint.
 */
interface TokenResponse {
  access_token: string;
  expires_in: number;
}

/**
 * Decrypted Keycloak credential stored in IntegrationCredential.
 */
interface KeycloakCredentialPayload {
  keycloakUrl: string;
  realm: string;
  clientId: string;
  clientSecret: string;
}

/** AES-256-GCM parameters matching IntegrationCredentialService. */
const CIPHER_ALGORITHM = "aes-256-gcm";
const CIPHER_IV_LENGTH = 12;
const CIPHER_TAG_LENGTH = 16;

/**
 * Job payload for a pipeline execution task.
 */
export interface PipelineExecutionJobData {
  pipelineId: string;
  runId: string;
  triggeredBy: string;
  /**
   * When set, the processor skips all stages whose order is less than this
   * value. Used when resuming a run after an approval stage is approved.
   */
  resumeFromStageOrder?: number;
}

/**
 * BullMQ worker that executes pipeline runs stage by stage,
 * streaming log lines via WebSocket and persisting results to the database.
 */
@Processor(QUEUE_NAMES.PIPELINE_EXECUTION)
export class PipelineProcessor extends WorkerHost {
  private readonly logger = new Logger(PipelineProcessor.name);

  /**
   * In-memory cache for Keycloak access tokens keyed by
   * "{orgId}:{realm}:{clientId}".
   */
  private readonly keycloakTokenCache = new Map<string, CachedToken>();

  /**
   * Derived AES-256-GCM key for decrypting IntegrationCredential values.
   * Initialised lazily when the first keycloak:// URI is encountered.
   */
  private encryptionKey: Buffer | null = null;

  constructor(
    @InjectRepository(PipelineRun)
    private readonly runRepository: Repository<PipelineRun>,
    @InjectRepository(Pipeline)
    private readonly pipelineRepository: Repository<Pipeline>,
    private readonly eventsGateway: EventsGateway,
    @Optional() private readonly helmDeployExecutor?: HelmDeployExecutor,
    @Optional() private readonly buildStageExecutor?: BuildStageExecutor,
    @Optional() private readonly infracostExecutor?: InfracostStageExecutor,
    @Optional() private readonly awsEcsExecutor?: AwsEcsExecutor,
    @Optional() private readonly awsLambdaExecutor?: AwsLambdaExecutor,
    @Optional() private readonly gcpCloudRunExecutor?: GcpCloudRunExecutor,
    @Optional()
    private readonly azureContainerAppsExecutor?: AzureContainerAppsExecutor,
    @Optional() private readonly cloudSecretsService?: CloudSecretsService,
    @Optional()
    @InjectRepository(IntegrationCredential)
    private readonly credentialRepository?: Repository<IntegrationCredential>,
    @Optional() private readonly githubActionsService?: GitHubActionsService,
    @Optional() private readonly argoCDService?: ArgoCDService,
    @Optional() private readonly deploymentsService?: DeploymentsService,
  ) {
    super();
  }

  /**
   * Processes a pipeline execution job.
   * Iterates through each stage in order, emits live log events, and
   * persists the final run status.
   *
   * When `job.data.resumeFromStageOrder` is present the processor skips
   * the initial run-setup block (status reset, startedAt, stageResults
   * clear) and only executes stages whose order is >= the provided value.
   */
  async process(job: Job<PipelineExecutionJobData>): Promise<void> {
    const { pipelineId, runId, resumeFromStageOrder } = job.data;
    this.logger.log(
      `Processing pipeline run ${runId} for pipeline ${pipelineId}` +
        (resumeFromStageOrder !== undefined
          ? ` (resuming from stage order ${resumeFromStageOrder})`
          : ""),
    );

    const run = await this.runRepository.findOne({ where: { id: runId } });
    if (!run) {
      this.logger.error(`Run ${runId} not found — aborting job`);
      return;
    }

    // Guard against a cancellation that raced with the job being picked up.
    if (run.status === PipelineRunStatus.CANCELLED) {
      this.logger.warn(`Run ${runId} is already cancelled — aborting job`);
      return;
    }

    const isResume = resumeFromStageOrder !== undefined;

    if (!isResume) {
      run.status = PipelineRunStatus.RUNNING;
      run.startedAt = new Date();
      run.stageResults = [];
      await this.runRepository.save(run);
    }

    const pipeline = await this.pipelineRepository.findOne({
      where: { id: pipelineId },
    });

    if (!pipeline) {
      await this.failRun(run, "Pipeline definition not found");
      return;
    }

    const allStages = [...pipeline.stages].sort((a, b) => a.order - b.order);
    const stages = isResume
      ? allStages.filter((s) => s.order >= resumeFromStageOrder)
      : allStages;

    try {
      for (const stage of stages) {
        // Check for cancellation before starting each stage.
        const freshRun = await this.runRepository.findOne({
          where: { id: runId },
        });
        if (freshRun?.status === PipelineRunStatus.CANCELLED) {
          this.logger.warn(
            `Run ${runId} was cancelled — stopping before stage "${stage.name}"`,
          );
          return;
        }

        const stageResult: StageResult = {
          stageId: stage.id,
          status: "running",
          startedAt: new Date().toISOString(),
          finishedAt: null,
          output: null,
        };

        // Resolve keycloak:// secret URIs in the stage config before execution.
        const orgId =
          (stage.config["orgId"] as string | undefined) ??
          pipeline.organizationId ??
          "";
        const resolvedConfig = await this.resolveKeycloakSecrets(
          stage.config,
          orgId,
        );
        stage.config = resolvedConfig;

        this.emitLog(
          runId,
          stage.name,
          `Starting stage "${stage.name}" (type: ${stage.type})`,
        );

        if (stage.type === "approval") {
          stageResult.status = "waiting_approval";
          stageResult.finishedAt = new Date().toISOString();
          run.stageResults = [...(run.stageResults ?? []), stageResult];
          run.status = PipelineRunStatus.WAITING_APPROVAL;
          await this.runRepository.save(run);

          this.emitLog(
            runId,
            stage.name,
            `Stage "${stage.name}" is waiting for approval`,
          );
          this.eventsGateway.server?.emit(
            FarmEvent.PIPELINE_RUN_UPDATED,
            this.buildRunSummary(run),
          );
          return;
        }

        // Dispatch deploy stages with engine=helm to the HelmDeployExecutor.
        if (
          stage.type === "deploy" &&
          stage.config?.engine === "helm" &&
          this.helmDeployExecutor
        ) {
          const helmConfig = stage.config as unknown as HelmDeployConfig;
          const result = await this.helmDeployExecutor.execute(
            helmConfig,
            (msg) => this.emitLog(runId, stage.name, msg),
          );
          stageResult.status = result.success ? "succeeded" : "failed";
          stageResult.output = result.output;
        } else if (
          stage.type === "deploy" &&
          stage.config?.engine === "aws-ecs" &&
          this.awsEcsExecutor
        ) {
          // Resolve any secret refs in the stage config before executing.
          const resolvedConfig = this.cloudSecretsService
            ? await this.cloudSecretsService.resolveConfigSecrets(
                stage.config,
                (stage.config as unknown as { orgId?: string }).orgId ?? "",
              )
            : stage.config;
          const result = await this.awsEcsExecutor.execute(
            resolvedConfig as unknown as AwsEcsDeployConfig,
            (msg) => this.emitLog(runId, stage.name, msg),
          );
          stageResult.status = result.success ? "succeeded" : "failed";
          stageResult.output = result.output;
        } else if (
          stage.type === "deploy" &&
          stage.config?.engine === "aws-lambda" &&
          this.awsLambdaExecutor
        ) {
          const resolvedConfig = this.cloudSecretsService
            ? await this.cloudSecretsService.resolveConfigSecrets(
                stage.config,
                (stage.config as unknown as { orgId?: string }).orgId ?? "",
              )
            : stage.config;
          const result = await this.awsLambdaExecutor.execute(
            resolvedConfig as unknown as AwsLambdaDeployConfig,
            (msg) => this.emitLog(runId, stage.name, msg),
          );
          stageResult.status = result.success ? "succeeded" : "failed";
          stageResult.output = result.output;
        } else if (
          stage.type === "deploy" &&
          stage.config?.engine === "gcp-cloud-run" &&
          this.gcpCloudRunExecutor
        ) {
          const resolvedConfig = this.cloudSecretsService
            ? await this.cloudSecretsService.resolveConfigSecrets(
                stage.config,
                (stage.config as unknown as { orgId?: string }).orgId ?? "",
              )
            : stage.config;
          const result = await this.gcpCloudRunExecutor.execute(
            resolvedConfig as unknown as GcpCloudRunDeployConfig,
            (msg) => this.emitLog(runId, stage.name, msg),
          );
          stageResult.status = result.success ? "succeeded" : "failed";
          stageResult.output = result.output;
        } else if (
          stage.type === "deploy" &&
          stage.config?.engine === "azure-container-apps" &&
          this.azureContainerAppsExecutor
        ) {
          const resolvedConfig = this.cloudSecretsService
            ? await this.cloudSecretsService.resolveConfigSecrets(
                stage.config,
                (stage.config as unknown as { orgId?: string }).orgId ?? "",
              )
            : stage.config;
          const result = await this.azureContainerAppsExecutor.execute(
            resolvedConfig as unknown as AzureContainerAppsDeployConfig,
            (msg) => this.emitLog(runId, stage.name, msg),
          );
          stageResult.status = result.success ? "succeeded" : "failed";
          stageResult.output = result.output;
        } else if (stage.type === "build" && this.buildStageExecutor) {
          // Dispatch build stages to BuildStageExecutor.
          const result = await this.buildStageExecutor.execute(
            stage,
            run,
            (msg) => this.emitLog(runId, stage.name, msg),
          );
          stageResult.status = result.success ? "succeeded" : "failed";
          stageResult.output = result.output;
        } else if (stage.type === "infracost" && this.infracostExecutor) {
          // Dispatch infracost stages to InfracostStageExecutor.
          const result = await this.infracostExecutor.execute(
            stage,
            run,
            (msg) => this.emitLog(runId, stage.name, msg),
          );
          stageResult.status = result.success ? "succeeded" : "failed";
          stageResult.output = result.output;
          if (!result.success) {
            run.status = PipelineRunStatus.FAILED;
          }
        } else if (
          stage.backend?.provider === "github-actions" &&
          this.githubActionsService
        ) {
          const { workflowId, ref = "main" } = stage.backend;
          if (!workflowId) {
            stageResult.status = "failed";
            stageResult.output = "github-actions backend requires workflowId";
          } else {
            const ghOrgId =
              (stage.config["orgId"] as string | undefined) ??
              pipeline.organizationId ??
              "";
            try {
              const triggeredRun =
                await this.githubActionsService.triggerWorkflow(
                  ghOrgId,
                  workflowId,
                  ref,
                );
              if (triggeredRun) {
                stageResult.externalRunId = String(triggeredRun.id);
                stageResult.externalRunUrl = triggeredRun.htmlUrl;
                stageResult.status = "running";
                stageResult.output = `GitHub Actions run ${triggeredRun.id} triggered: ${triggeredRun.htmlUrl}`;
              } else {
                stageResult.status = "running";
                stageResult.output =
                  "GitHub Actions run triggered (run ID not yet available)";
              }
            } catch (err) {
              stageResult.status = "failed";
              stageResult.output =
                err instanceof Error ? err.message : String(err);
            }
          }
        } else if (stage.backend?.provider === "argocd" && this.argoCDService) {
          const { appName } = stage.backend;
          const acdOrgId =
            (stage.config["orgId"] as string | undefined) ??
            pipeline.organizationId ??
            "";
          if (!appName) {
            stageResult.status = "failed";
            stageResult.output = "argocd backend requires appName";
          } else {
            try {
              await this.argoCDService.syncApplication(acdOrgId, appName);
              stageResult.status = "running";
              stageResult.output = `ArgoCD sync triggered for ${appName}`;
            } catch (err) {
              stageResult.status = "failed";
              stageResult.output =
                err instanceof Error ? err.message : String(err);
            }
          }
        } else {
          // Simulate work for all other stage types.
          await new Promise<void>((resolve) => setTimeout(resolve, 500));
          stageResult.status = "succeeded";
          stageResult.output = `Stage "${stage.name}" completed successfully`;
        }

        // Auto-create a Deployment record when a deploy stage succeeds synchronously.
        if (
          stageResult.status === "succeeded" &&
          stage.backend?.componentId &&
          stage.backend?.environmentId &&
          this.deploymentsService
        ) {
          try {
            const deployment = await this.deploymentsService.create({
              componentId: stage.backend.componentId,
              environmentId: stage.backend.environmentId,
              version:
                typeof run.metadata?.["version"] === "string"
                  ? run.metadata["version"]
                  : "latest",
              deployedBy: run.triggeredBy,
              description: `Auto-created by pipeline run ${run.id}`,
              pipelineRunId: run.id,
            });
            run.deploymentId = deployment.id;
            this.logger.log(
              `Auto-created deployment ${deployment.id} from pipeline run ${run.id}`,
            );
          } catch (err) {
            this.logger.warn(
              `Failed to auto-create deployment from pipeline run ${run.id}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }

        // Only set finishedAt for synchronously completed stages; external
        // backends (github-actions, argocd) will update it via webhook.
        if (stageResult.status !== "running") {
          stageResult.finishedAt = new Date().toISOString();
        }
        run.stageResults = [...(run.stageResults ?? []), stageResult];

        // Emit per-stage update event.
        const stagePayload: PipelineStageUpdatedPayload = {
          runId,
          pipelineId,
          stageId: stage.id,
          status: stageResult.status,
          externalRunId: stageResult.externalRunId ?? null,
          externalRunUrl: stageResult.externalRunUrl ?? null,
          startedAt: stageResult.startedAt,
          finishedAt: stageResult.finishedAt,
          timestamp: new Date().toISOString(),
        };
        this.eventsGateway.server?.emit(
          FarmEvent.PIPELINE_STAGE_UPDATED,
          stagePayload,
        );

        this.emitLog(
          runId,
          stage.name,
          `Stage "${stage.name}" ${stageResult.status}`,
        );

        // For delegated external backend stages the run stays RUNNING until
        // a webhook drives it to a terminal state.
        if (stageResult.status === "running") {
          run.status = PipelineRunStatus.RUNNING;
          await this.runRepository.save(run);
          this.logger.log(
            `Pipeline run ${runId} is waiting for external stage "${stage.name}" to complete`,
          );
          this.eventsGateway.server?.emit(
            FarmEvent.PIPELINE_RUN_UPDATED,
            this.buildRunSummary(run),
          );
          return;
        }

        // Abort the run immediately if any non-approval stage has failed.
        if (stageResult.status === "failed") {
          await this.failRun(
            run,
            `Stage "${stage.name}" failed: ${stageResult.output ?? "unknown error"}`,
          );
          return;
        }
      }

      run.status = PipelineRunStatus.SUCCEEDED;
      run.finishedAt = new Date();
      run.durationMs = run.startedAt
        ? run.finishedAt.getTime() - run.startedAt.getTime()
        : null;

      await this.runRepository.save(run);

      this.logger.log(`Pipeline run ${runId} succeeded`);
      this.eventsGateway.server?.emit(
        FarmEvent.PIPELINE_RUN_UPDATED,
        this.buildRunSummary(run),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.failRun(run, message);
    }
  }

  /**
   * Marks the run as failed, persists the record, and emits an update event.
   */
  private async failRun(run: PipelineRun, reason: string): Promise<void> {
    run.status = PipelineRunStatus.FAILED;
    run.finishedAt = new Date();
    run.durationMs = run.startedAt
      ? run.finishedAt.getTime() - run.startedAt.getTime()
      : null;

    await this.runRepository.save(run);

    this.logger.error(`Pipeline run ${run.id} failed: ${reason}`);
    this.eventsGateway.server?.emit(
      FarmEvent.PIPELINE_RUN_UPDATED,
      this.buildRunSummary(run),
    );
  }

  /**
   * Emits a single log line for a stage via the WebSocket gateway.
   */
  private emitLog(runId: string, stageName: string, message: string): void {
    this.eventsGateway.server?.emit(FarmEvent.PIPELINE_LOG, {
      runId,
      stage: stageName,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Builds a lightweight run summary object for event payloads.
   */
  private buildRunSummary(run: PipelineRun): Record<string, unknown> {
    return {
      id: run.id,
      pipelineId: run.pipelineId,
      status: run.status,
      triggeredBy: run.triggeredBy,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      durationMs: run.durationMs,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Scans a stage config object for values matching the `keycloak://` URI
   * scheme and resolves each to a short-lived access token.  All other values
   * are returned unchanged.
   *
   * @param config - Arbitrary stage config record
   * @param orgId - Organization UUID used to look up the credential
   * @returns A new config record with keycloak:// values replaced by tokens
   */
  async resolveKeycloakSecrets(
    config: Record<string, unknown>,
    orgId: string,
  ): Promise<Record<string, unknown>> {
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === "string" && value.startsWith("keycloak://")) {
        try {
          resolved[key] = await this.resolveKeycloakSecret(value, orgId);
        } catch (err) {
          this.logger.warn(
            `Failed to resolve keycloak:// URI "${value}" — using raw value`,
            err,
          );
          resolved[key] = value;
        }
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Resolves a single `keycloak://{realm}/{clientId}` URI to an access token.
   *
   * The token is cached in memory until 30 seconds before its expiry to avoid
   * unnecessary round-trips to the Keycloak token endpoint.
   *
   * @param uri - A string of the form `keycloak://{realm}/{clientId}`
   * @param orgId - Organization UUID used to look up the credential
   * @returns The access_token string
   */
  async resolveKeycloakSecret(uri: string, orgId: string): Promise<string> {
    // Parse: keycloak://{realm}/{clientId}
    const withoutScheme = uri.replace(/^keycloak:\/\//, "");
    const slashIdx = withoutScheme.indexOf("/");
    const realm =
      slashIdx !== -1 ? withoutScheme.slice(0, slashIdx) : withoutScheme;
    const clientId = slashIdx !== -1 ? withoutScheme.slice(slashIdx + 1) : "";

    const cacheKey = `${orgId}:${realm}:${clientId}`;
    const cached = this.keycloakTokenCache.get(cacheKey);

    if (cached && Date.now() < cached.expiresAt) {
      return cached.token;
    }

    if (!this.credentialRepository) {
      throw new Error(
        "IntegrationCredential repository not available in PipelineProcessor",
      );
    }

    // Load the org's Keycloak credential.
    const credential = await this.credentialRepository.findOne({
      where: { orgId, type: IntegrationType.KEYCLOAK },
      order: { createdAt: "DESC" },
    });

    if (!credential) {
      throw new Error(
        `No Keycloak credential found for org ${orgId} — cannot resolve ${uri}`,
      );
    }

    const payload = JSON.parse(
      this.decryptCredential(credential.encryptedValue),
    ) as KeycloakCredentialPayload;

    const tokenUrl = `${payload.keycloakUrl}/realms/${realm}/protocol/openid-connect/token`;

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId || payload.clientId,
      client_secret: payload.clientSecret,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(
        `Keycloak token request failed for ${uri}: ` +
          `${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as TokenResponse;
    const expiresInMs = (data.expires_in - 30) * 1000;

    this.keycloakTokenCache.set(cacheKey, {
      token: data.access_token,
      expiresAt: Date.now() + expiresInMs,
    });

    return data.access_token;
  }

  /**
   * Decrypts an AES-256-GCM encrypted credential value.
   * Replicates the logic from IntegrationCredentialService.
   *
   * @param encryptedValue - Base64-encoded payload: iv(12) + tag(16) + ciphertext
   * @returns The original plain-text string
   */
  private decryptCredential(encryptedValue: string): string {
    if (!this.encryptionKey) {
      const jwtSecret = process.env.JWT_SECRET ?? "";
      this.encryptionKey = crypto
        .createHash("sha256")
        .update(jwtSecret)
        .digest();
    }

    const buffer = Buffer.from(encryptedValue, "base64");
    const iv = buffer.subarray(0, CIPHER_IV_LENGTH);
    const tag = buffer.subarray(
      CIPHER_IV_LENGTH,
      CIPHER_IV_LENGTH + CIPHER_TAG_LENGTH,
    );
    const ciphertext = buffer.subarray(CIPHER_IV_LENGTH + CIPHER_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(
      CIPHER_ALGORITHM,
      this.encryptionKey,
      iv,
    );
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  }
}
