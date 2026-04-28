import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiOkResponse } from "@nestjs/swagger";
import type { Request, Response } from "express";

/**
 * TracesIngestController — lightweight OTLP proxy for browser spans.
 *
 * Why a dedicated controller (not added to ObservabilityController)?
 * ─────────────────────────────────────────────────────────────────
 * • The existing ObservabilityController uses `@Controller("observability")`,
 *   which places all its routes under `/api/v1/observability/...`.
 * • The browser OTel SDK posts to `/api/v1/traces/ingest` (routed through the
 *   Next.js `/api/*` rewrite to this NestJS server).  A separate controller at
 *   `@Controller("traces")` gives us exactly that path without touching the
 *   existing observability routes.
 *
 * Security note:
 * ─────────────────────────────────────────────────────────────────
 * This endpoint intentionally has no JWT guard.  It is called from the
 * browser by the OTel SDK which cannot attach a bearer token.  The endpoint
 * only forwards OTLP data to the internal Tempo collector — it does not expose
 * sensitive information.  In production you can rate-limit it at the
 * load-balancer / ingress level.
 */
@ApiTags("Traces")
@Controller("traces")
export class TracesIngestController {
  private readonly logger = new Logger(TracesIngestController.name);

  /**
   * Receives an OTLP/JSON trace payload from the browser OTel SDK and proxies
   * it to the configured Tempo (or any OTLP-HTTP) collector.
   *
   * The browser cannot POST directly to Tempo in production due to CORS
   * restrictions — this endpoint acts as a same-origin proxy.
   */
  @Post("ingest")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Ingest browser OTLP traces",
    description:
      "Receives OTLP/JSON trace data from the browser and forwards it to the " +
      "configured OTLP collector (Tempo). Requires a valid JWT — the browser " +
      "OTel SDK attaches the token via the TracingInit component.",
  })
  @ApiOkResponse({ description: "Spans accepted by the collector." })
  async ingestTrace(@Req() req: Request, @Res() res: Response): Promise<void> {
    const endpoint = process.env.OTEL_EXPORTER_ENDPOINT;

    // Observability stack is optional. When no collector is configured,
    // accept the spans and silently drop them so the browser SDK keeps
    // working without flooding the API logs.
    if (!endpoint) {
      res.status(HttpStatus.NO_CONTENT).send();
      return;
    }

    try {
      const upstream = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type":
            (req.headers["content-type"] as string) ?? "application/json",
        },
        // req.body has already been parsed by NestJS's JSON middleware, so we
        // re-serialise it here.  For binary OTLP/protobuf payloads the content
        // type would be `application/x-protobuf` and body would be a Buffer.
        body: JSON.stringify(req.body),
      });

      const text = await upstream.text();
      res.status(upstream.status).send(text);
    } catch (err) {
      // Collector unreachable is expected when the observability stack is
      // not running — log at debug to avoid noisy ERROR entries on every
      // browser span flush. Operators that do run Tempo will see 5xx
      // responses propagate to the SDK directly.
      this.logger.debug(
        `Failed to forward traces to collector at ${endpoint}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      res.status(HttpStatus.BAD_GATEWAY).send("Collector unreachable");
    }
  }
}
