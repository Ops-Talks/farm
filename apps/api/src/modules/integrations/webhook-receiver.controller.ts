import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Optional,
  Headers,
  UnauthorizedException,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
} from "@nestjs/swagger";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { FarmEvent } from "../../common/events/events.interfaces";
import { createHmac, timingSafeEqual } from "crypto";
import { Public } from "../../common/decorators/public.decorator";

/**
 * Controller for receiving inbound CI/CD webhook payloads.
 * All endpoints are unauthenticated (webhook secrets are validated
 * at the service layer if required) and return HTTP 200.
 */
@Public()
@ApiTags("Webhooks")
@Controller("webhooks")
export class WebhookReceiverController {
  private readonly logger = new Logger(WebhookReceiverController.name);

  constructor(@Optional() private readonly eventEmitter?: EventEmitter2) {}

  /**
   * Receives CircleCI webhook payloads and emits a CI_BUILD_UPDATED event.
   *
   * @param payload - Inbound CircleCI webhook body
   */
  @Post("circleci")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Receive CircleCI webhook" })
  @ApiBody({
    schema: { type: "object", additionalProperties: true },
    description: "CircleCI webhook payload",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Webhook received and processed.",
  })
  receiveCircleCI(@Body() payload: Record<string, unknown>): { ok: boolean } {
    const eventType =
      typeof payload["type"] === "string" ? payload["type"] : "unknown";
    this.logger.debug(`CircleCI webhook received: type=${eventType}`);
    this.eventEmitter?.emit(FarmEvent.CI_BUILD_UPDATED, {
      source: "circleci",
      ...payload,
    });
    return { ok: true };
  }

  /**
   * Receives Jenkins Generic Webhook Trigger payloads and emits a
   * CI_BUILD_UPDATED event.
   *
   * @param payload - Inbound Jenkins webhook body
   */
  @Post("jenkins")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Receive Jenkins webhook" })
  @ApiBody({
    schema: { type: "object", additionalProperties: true },
    description: "Jenkins webhook payload",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Webhook received and processed.",
  })
  receiveJenkins(@Body() payload: Record<string, unknown>): { ok: boolean } {
    const jobName =
      typeof payload["name"] === "string" ? payload["name"] : "unknown";
    this.logger.debug(`Jenkins webhook received: job=${jobName}`);
    this.eventEmitter?.emit(FarmEvent.CI_BUILD_UPDATED, {
      source: "jenkins",
      ...payload,
    });
    return { ok: true };
  }

  /**
   * Receives Travis CI webhook payloads and emits a CI_BUILD_UPDATED event.
   *
   * @param payload - Inbound Travis CI webhook body
   */
  @Post("travisci")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Receive Travis CI webhook" })
  @ApiBody({
    schema: { type: "object", additionalProperties: true },
    description: "Travis CI webhook payload",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Webhook received and processed.",
  })
  receiveTravisCI(@Body() payload: Record<string, unknown>): { ok: boolean } {
    const buildId =
      typeof payload["id"] === "string" || typeof payload["id"] === "number"
        ? String(payload["id"])
        : "unknown";
    this.logger.debug(`Travis CI webhook received: id=${buildId}`);
    this.eventEmitter?.emit(FarmEvent.CI_BUILD_UPDATED, {
      source: "travisci",
      ...payload,
    });
    return { ok: true };
  }

  /**
   * Receives GitHub Actions webhook payloads (workflow_run events).
   * Validates x-hub-signature-256 if GITHUB_WEBHOOK_SECRET is set.
   *
   * @param signature - HMAC-SHA256 signature header from GitHub
   * @param payload - Inbound GitHub Actions webhook body
   */
  @Post("github-actions")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Receive GitHub Actions webhook" })
  @ApiHeader({
    name: "x-hub-signature-256",
    required: false,
    description:
      "GitHub webhook signature for HMAC-SHA256 payload verification. " +
      "Required when a webhook secret is configured on the GitHub side " +
      "(GITHUB_WEBHOOK_SECRET environment variable). " +
      "Format: sha256=<hex-digest>.",
  })
  @ApiBody({
    schema: { type: "object", additionalProperties: true },
    description: "GitHub Actions webhook payload",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Webhook received and processed.",
  })
  receiveGitHubActions(
    @Headers("x-hub-signature-256") signature: string | undefined,
    @Body() payload: Record<string, unknown>,
    @Req() req: Request & { rawBody?: Buffer },
  ): { ok: boolean } {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (secret) {
      if (!signature) {
        this.logger.warn(
          "GitHub Actions webhook received without signature (secret is configured)",
        );
        throw new UnauthorizedException("Missing webhook signature");
      }
      if (!req.rawBody) {
        this.logger.warn(
          "GitHub Actions webhook: rawBody is not available — " +
            "ensure the raw-body middleware is applied to this route",
        );
        throw new UnauthorizedException(
          "Raw request body unavailable for signature verification",
        );
      }
      const rawBody = req.rawBody.toString("utf8");
      const expectedSig =
        "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
      // Buffers must be the same length for timingSafeEqual.
      if (
        signature.length !== expectedSig.length ||
        !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))
      ) {
        this.logger.warn("GitHub Actions webhook signature mismatch");
        throw new UnauthorizedException("Invalid webhook signature");
      }
    }
    const event = payload["action"] as string | undefined;
    this.logger.debug(`GitHub Actions webhook: action=${event ?? "unknown"}`);
    this.eventEmitter?.emit(FarmEvent.CI_BUILD_UPDATED, {
      source: "github-actions",
      ...payload,
    });
    return { ok: true };
  }

  /**
   * Receives ArgoCD sync status webhook payloads and emits a CI_BUILD_UPDATED event.
   *
   * @param payload - Inbound ArgoCD webhook body
   */
  @Post("argocd")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Receive ArgoCD sync status webhook" })
  @ApiBody({
    schema: { type: "object", additionalProperties: true },
    description: "ArgoCD webhook payload",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Webhook received and processed.",
  })
  receiveArgoCDWebhook(@Body() payload: Record<string, unknown>): {
    ok: boolean;
  } {
    const appName =
      typeof payload["app"] === "string" ? payload["app"] : "unknown";
    this.logger.debug(`ArgoCD webhook received: app=${appName}`);
    this.eventEmitter?.emit(FarmEvent.CI_BUILD_UPDATED, {
      source: "argocd",
      ...payload,
    });
    return { ok: true };
  }
}
