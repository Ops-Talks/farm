import { format, transports } from "winston";
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModuleOptions,
} from "nest-winston";
import "winston-daily-rotate-file";
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
 * Provides different logging formats for development and production.
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
      // Add file transport for production environment
      ...(isProduction
        ? [
            new transports.DailyRotateFile({
              filename: "logs/application-%DATE%.log",
              datePattern: "YYYY-MM-DD",
              zippedArchive: true,
              maxSize: "20m",
              maxFiles: "14d",
              format: format.combine(
                format.timestamp(),
                traceIdFormat(),
                format.json(),
              ),
            }),
            new transports.DailyRotateFile({
              filename: "logs/error-%DATE%.log",
              datePattern: "YYYY-MM-DD",
              zippedArchive: true,
              maxSize: "20m",
              maxFiles: "14d",
              level: "error",
              format: format.combine(
                format.timestamp(),
                traceIdFormat(),
                format.json(),
              ),
            }),
          ]
        : []),
    ],
  };
};
