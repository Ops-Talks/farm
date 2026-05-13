import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Optional,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { FarmEvent } from "../../common/events/events.interfaces";

/**
 * Controller for receiving inbound CI/CD webhook payloads.
 * All endpoints are unauthenticated (webhook secrets are validated
 * at the service layer if required) and return HTTP 200.
 */
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
}
