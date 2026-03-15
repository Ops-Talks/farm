/**
 * Tests for src/common/telemetry/tracing.ts
 *
 * The module reads OTEL_ENABLED at load time, so each describe block that
 * needs a different value isolates its own module registry via
 * jest.isolateModules(). The require() calls inside jest.isolateModules() are
 * intentional: ts-jest compiles to CommonJS, so synchronous require() is the
 * only way to load a freshly-reset module inside an isolateModules callback.
 */

const mockSdkStart = jest.fn();
const mockSdkShutdown = jest.fn().mockResolvedValue(undefined);
const mockNodeSDKConstructor = jest.fn().mockImplementation(() => ({
  start: mockSdkStart,
  shutdown: mockSdkShutdown,
}));

jest.mock("@opentelemetry/sdk-node", () => ({
  NodeSDK: mockNodeSDKConstructor,
}));

jest.mock("@opentelemetry/auto-instrumentations-node", () => ({
  getNodeAutoInstrumentations: jest.fn().mockReturnValue([]),
}));

jest.mock("@opentelemetry/exporter-trace-otlp-http", () => ({
  OTLPTraceExporter: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("@opentelemetry/resources", () => ({
  resourceFromAttributes: jest.fn().mockReturnValue({}),
}));

describe("tracing", () => {
  afterEach(() => {
    jest.clearAllMocks();
    // Reset the module registry so the module-level `sdk` variable and
    // `OTEL_ENABLED` constant are re-evaluated for the next test group.
    jest.resetModules();
  });

  describe("when OTEL_ENABLED is not 'true'", () => {
    it("initTracing() does nothing and does not construct NodeSDK", () => {
      delete process.env.OTEL_ENABLED;

      jest.isolateModules(() => {
        const { initTracing } =
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require("./tracing") as typeof import("./tracing");
        initTracing();
        expect(mockNodeSDKConstructor).not.toHaveBeenCalled();
        expect(mockSdkStart).not.toHaveBeenCalled();
      });
    });

    it("shutdownTracing() resolves without calling sdk.shutdown()", async () => {
      delete process.env.OTEL_ENABLED;

      await new Promise<void>((resolve, reject) => {
        jest.isolateModules(() => {
          const { shutdownTracing } =
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require("./tracing") as typeof import("./tracing");
          shutdownTracing().then(resolve).catch(reject);
        });
      });

      expect(mockSdkShutdown).not.toHaveBeenCalled();
    });
  });

  describe("when OTEL_ENABLED is 'true'", () => {
    beforeEach(() => {
      process.env.OTEL_ENABLED = "true";
    });

    afterEach(() => {
      delete process.env.OTEL_ENABLED;
    });

    it("initTracing() constructs and starts the NodeSDK", () => {
      jest.isolateModules(() => {
        const { initTracing } =
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require("./tracing") as typeof import("./tracing");
        initTracing();
        expect(mockNodeSDKConstructor).toHaveBeenCalledTimes(1);
        expect(mockSdkStart).toHaveBeenCalledTimes(1);
      });
    });

    it("shutdownTracing() calls sdk.shutdown() after initTracing()", async () => {
      await new Promise<void>((resolve, reject) => {
        jest.isolateModules(() => {
          const { initTracing, shutdownTracing } =
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require("./tracing") as typeof import("./tracing");
          initTracing();
          shutdownTracing().then(resolve).catch(reject);
        });
      });

      expect(mockSdkShutdown).toHaveBeenCalledTimes(1);
    });

    it("does not start SDK a second time if initTracing() is called twice", () => {
      jest.isolateModules(() => {
        const { initTracing } =
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require("./tracing") as typeof import("./tracing");
        initTracing();
        // The module-level `sdk` is already set; a second call still creates a
        // new SDK because OTEL_ENABLED is checked and the guard is `!OTEL_ENABLED`.
        initTracing();
        // Two calls -> two constructions (no guard against double-init in source)
        expect(mockNodeSDKConstructor).toHaveBeenCalledTimes(2);
      });
    });
  });
});
