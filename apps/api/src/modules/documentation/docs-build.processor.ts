import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
import { DocumentationBuildService } from "./documentation-build.service";
import { DocBuilderFactory } from "./builders/doc-builder.factory";
import { MkDocsBuilder } from "./builders/mkdocs.builder";

/**
 * Payload enqueued when a documentation build is triggered via webhook or API.
 */
export interface DocsBuildJobData {
  /** Remote Git URL of the repository to build documentation from. */
  repoUrl: string;
  /** Full Git ref (branch, tag, or commit) to check out. */
  ref: string;
  /** UUID of the catalog component owning this documentation, or null for webhook-triggered builds. */
  componentId: string | null;
}

/**
 * Parses a Git ref into a human-readable version string.
 * Tags: 'refs/tags/v1.2.0' -> 'v1.2.0'
 * Branches: 'refs/heads/main' -> 'main'
 * Other: returned as-is.
 *
 * @param ref - Full Git ref string
 * @returns Short version identifier
 */
function parseVersion(ref: string): string {
  const tagMatch = ref.match(/^refs\/tags\/(.+)$/);
  if (tagMatch) {
    return tagMatch[1];
  }
  return ref.replace(/^refs\/heads\//, "");
}

/**
 * BullMQ worker that processes documentation build jobs.
 *
 * For each job it:
 * 1. Creates a DocumentationBuild record with status 'building'.
 * 2. Resolves the appropriate DocBuilder for the repository.
 * 3. Runs the build and updates the record to 'ready' or 'failed'.
 * 4. Emits a 'docs.build-complete' event via EventEmitter2.
 */
@Processor(QUEUE_NAMES.DOCS_BUILD)
export class DocsBuildProcessor extends WorkerHost {
  private readonly logger = new Logger(DocsBuildProcessor.name);

  constructor(
    private readonly buildService: DocumentationBuildService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<DocsBuildJobData>): Promise<void> {
    const { repoUrl, ref, componentId } = job.data;
    const version = parseVersion(ref);

    this.logger.log(
      `Processing docs build job ${job.id}: repo=${repoUrl} ref=${ref}`,
    );

    const build = await this.buildService.create(
      componentId ?? repoUrl,
      version,
      "markdown", // sourceType determined after resolution; default until builder is known
    );

    let finalStatus: "ready" | "failed" = "failed";

    try {
      const builder = await DocBuilderFactory.resolve(repoUrl, ref);
      const sourceType =
        builder instanceof MkDocsBuilder ? "mkdocs" : "markdown";

      this.logger.log(
        `Resolved builder ${sourceType} for job ${job.id}; starting build`,
      );

      const result = await builder.build(build.id, repoUrl, ref);
      finalStatus = result.status;

      await this.buildService.updateStatus(build.id, result.status, {
        buildLog: result.buildLog,
        artifactsPath: result.artifactsPath,
        completedAt: new Date(),
      });

      this.logger.log(
        `Job ${job.id} finished with status ${result.status} (sourceType=${sourceType})`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Job ${job.id} failed: ${message}`);

      finalStatus = "failed";

      await this.buildService.updateStatus(build.id, "failed", {
        buildLog: message,
        completedAt: new Date(),
      });
    } finally {
      this.eventEmitter.emit("docs.build-complete", {
        buildId: build.id,
        status: finalStatus,
      });
    }
  }
}
