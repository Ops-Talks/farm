import { loggerConfigFactory } from "./logger.config";
import * as otelApi from "@opentelemetry/api";

describe("LoggerConfig", () => {
  it("should return a valid Winston configuration for development", () => {
    const config = loggerConfigFactory("development", "debug");
    expect(config).toBeDefined();
    expect(config.level).toBe("debug");
    expect(config.transports).toBeDefined();
    expect(Array.isArray(config.transports)).toBe(true);
  });

  it("should return a valid Winston configuration for production", () => {
    const config = loggerConfigFactory("production", "info");
    expect(config).toBeDefined();
    expect(config.level).toBe("info");
    // Should have console transport + 2 file transports
    expect((config.transports as any[]).length).toBe(3);
  });
});

describe("LoggerConfig — traceIdFormat integration", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should inject trace_id and span_id into a log entry when an active span exists", () => {
    const mockCtx = { traceId: "trace-id-123", spanId: "span-id-456" };
    const mockSpan = { spanContext: jest.fn().mockReturnValue(mockCtx) };
    jest
      .spyOn(otelApi.trace, "getActiveSpan")
      .mockReturnValue(mockSpan as unknown as otelApi.Span);

    // Build a production config that uses the traceIdFormat transport chain.
    const config = loggerConfigFactory("production", "info");
    const consoleTransport = (
      config.transports as unknown as Array<{
        format: {
          transform: (
            info: Record<string, unknown>,
            opts: Record<string, unknown>,
          ) => Record<string, unknown>;
        };
      }>
    )[0];

    // Invoke the combined format's transform to execute traceIdFormat's callback
    // while the span mock is active.
    const info: Record<string, unknown> = {
      level: "info",
      message: "hello",
      [Symbol.for("level") as unknown as string]: "info",
    };
    const result = consoleTransport.format.transform(info, {});

    // traceIdFormat should have injected the context fields.
    expect(result["trace_id"]).toBe("trace-id-123");
    expect(result["span_id"]).toBe("span-id-456");
  });

  it("should not inject trace context when no active span exists", () => {
    jest.spyOn(otelApi.trace, "getActiveSpan").mockReturnValue(undefined);

    const config = loggerConfigFactory("production", "info");
    const consoleTransport = (
      config.transports as unknown as Array<{
        format: {
          transform: (
            info: Record<string, unknown>,
            opts: Record<string, unknown>,
          ) => Record<string, unknown>;
        };
      }>
    )[0];

    const info: Record<string, unknown> = {
      level: "info",
      message: "hello",
      [Symbol.for("level") as unknown as string]: "info",
    };
    const result = consoleTransport.format.transform(info, {});

    expect(result["trace_id"]).toBeUndefined();
    expect(result["span_id"]).toBeUndefined();
  });
});
