import * as crypto from "crypto";
import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { ConfigService } from "@nestjs/config";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { QUEUE_NAMES } from "../../common/queues/queue-names";
import { DocsWebhookDto } from "./dto/docs-webhook.dto";
import { DocsBuildJobData } from "./docs-build.processor";

/**
 * Regex that identifies file paths relevant to documentation builds.
 * Matches any Markdown or YAML file, or any path inside a docs/ directory.
 */
const RELEVANT_PATHS = /\.(md|yml|yaml)$|^docs\//i;

/**
 * Determines whether a push event contains changes to documentation-related files.
 * If no commit information is provided, the push is assumed to be relevant.
 *
 * @param commits - Array of commit objects from the webhook payload
 * @returns True when at least one changed file matches RELEVANT_PATHS
 */
function hasRelevantChanges(commits: DocsWebhookDto["commits"]): boolean {
  if (!commits?.length) {
    return true;
  }
  return commits.some((c) =>
    [...(c.added ?? []), ...(c.removed ?? []), ...(c.modified ?? [])].some(
      (f) => RELEVANT_PATHS.test(f),
    ),
  );
}

/**
 * Controller that receives push webhook events from GitHub and enqueues a
 * documentation build job when relevant files are detected.
 *
 * HMAC signature verification is always performed. The DOCS_WEBHOOK_SECRET
 * environment variable must be configured; requests are rejected with HTTP 403
 * when the secret is not set.
 */
@ApiTags("Documentation")
@Controller("docs")
export class DocsWebhookController {
  private readonly logger = new Logger(DocsWebhookController.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.DOCS_BUILD)
    private readonly buildQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Receives a GitHub push webhook and optionally triggers a documentation
   * build by enqueuing a DocsBuildJob.
   *
   * @param signature - Value of the X-Hub-Signature-256 header
   * @param req - Express request (may contain rawBody for HMAC verification)
   * @param body - Parsed webhook payload
   * @returns Object indicating whether a build job was enqueued
   */
  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Receive GitHub push webhook and trigger a documentation build",
  })
  async handleWebhook(
    @Headers("x-hub-signature-256") signature: string | undefined,
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: DocsWebhookDto,
  ): Promise<{ queued: boolean }> {
    const secret = this.configService.get<string>("docs.webhookSecret");

    if (!secret) {
      this.logger.warn(
        "DOCS_WEBHOOK_SECRET is not configured — rejecting webhook request",
      );
      throw new ForbiddenException(
        "Webhook endpoint is disabled: DOCS_WEBHOOK_SECRET is not configured",
      );
    }

    if (!signature) {
      this.logger.warn("Webhook received without X-Hub-Signature-256 header");
      throw new UnauthorizedException("Missing webhook signature");
    }

    const payload = req.rawBody ?? Buffer.from(JSON.stringify(body));
    const expected =
      "sha256=" +
      crypto.createHmac("sha256", secret).update(payload).digest("hex");

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      this.logger.warn("Webhook signature mismatch");
      throw new UnauthorizedException("Invalid webhook signature");
    }

    if (!hasRelevantChanges(body.commits)) {
      this.logger.log(
        `Webhook push for ${body.repository.clone_url} has no docs-related changes; skipping build`,
      );
      return { queued: false };
    }

    const jobData: DocsBuildJobData = {
      repoUrl: body.repository.clone_url,
      ref: body.ref,
      componentId: null,
    };

    await this.buildQueue.add(QUEUE_NAMES.DOCS_BUILD, jobData);

    this.logger.log(
      `Enqueued docs build for ${body.repository.clone_url} at ref ${body.ref}`,
    );

    return { queued: true };
  }
}
