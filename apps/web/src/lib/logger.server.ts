/**
 * Server-only Winston logger for farm-web.
 *
 * This module MUST NOT be imported by client-side code. The `.server.ts`
 * suffix causes Next.js to throw a build error if a client component or
 * client-side module attempts to import it.
 *
 * In production the logger emits JSON to stdout (same schema as farm-api),
 * so Promtail can extract `level`, `message`, and `context` labels.
 *
 * In development a human-readable colorized format is used instead.
 */

import winston, { format, transports } from 'winston';
import { trace } from '@opentelemetry/api';

/**
 * Custom format that injects `trace_id` and `span_id` into every log entry
 * when an active OpenTelemetry span exists on the current async context.
 */
const traceIdFormat = format((info) => {
  const span = trace.getActiveSpan();
  if (span) {
    const ctx = span.spanContext();
    info['trace_id'] = ctx.traceId;
    info['span_id'] = ctx.spanId;
  }
  return info;
});

/**
 * Custom format that applies the default `context` label when the log entry
 * does not already carry one. Child loggers (created via `createLogger`) set
 * their own context via `defaultMeta`, which takes precedence because winston
 * merges child metadata before this format runs.
 */
const defaultContextFormat = format((info) => {
  if (!Object.prototype.hasOwnProperty.call(info, 'context')) {
    info['context'] = 'farm-web';
  }
  return info;
});

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug');

const jsonFormat = format.combine(
  format.timestamp(),
  defaultContextFormat(),
  traceIdFormat(),
  format.json(),
);

const prettyFormat = format.combine(
  format.colorize({ all: true }),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  defaultContextFormat(),
  format.printf(({ timestamp, level, message, context: ctx, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${String(timestamp)} [${String(ctx)}] ${level}: ${String(message)}${extra}`;
  }),
);

export const logger = winston.createLogger({
  level: logLevel,
  format: isProduction ? jsonFormat : prettyFormat,
  transports: [new transports.Console()],
});

/**
 * Creates a child logger bound to a specific context label.
 *
 * All log entries emitted by the child will include `context: contextName`,
 * overriding the default `"farm-web"` context set on the root logger.
 */
export function createLogger(contextName: string): winston.Logger {
  return logger.child({ context: contextName });
}
