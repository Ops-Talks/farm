import { format, transports } from "winston";
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModuleOptions,
} from "nest-winston";
import { trace } from "@opentelemetry/api";

/**
 * Custom Winston format that injects the active OpenTelemetry trace and span IDs
 * into every log entry, enabling log-trace correlation.
 */
const traceIdFormat = format((info) => {
  const span = trace.getActiveSpan();
  if (span) {
    const ctx = span.spanContext();
    info["trace_id"] = ctx.traceId;
    info["span_id"] = ctx.spanId;
  }
  return info;
});

/**
 * Winston configuration factory.
 *
 * Logs are always written to stdout/stderr (console transport only).
 * This follows the 12-factor app principle XII: treat logs as event streams.
 * In Kubernetes, a log aggregator (Promtail/Loki, Fluentd, etc.) collects
 * container stdout/stderr — file transports inside a container are redundant,
 * break readOnlyRootFilesystem, and lose data on pod restarts.
 */
export const loggerConfigFactory = (
  env: string,
  logLevel: string,
): WinstonModuleOptions => {
  const isProduction = env === "production";

  return {
    level: logLevel,
    transports: [
      new transports.Console({
        format: format.combine(
          format.timestamp(),
          format.ms(),
          isProduction
            ? format.combine(format.timestamp(), traceIdFormat(), format.json())
            : nestWinstonModuleUtilities.format.nestLike("Farm", {
                colors: true,
                prettyPrint: true,
              }),
        ),
      }),
    ],
  };
};
