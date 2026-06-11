import { ConfigService } from "@nestjs/config";
import { PyroscopeInitService } from "./pyroscope-init.service";

const mockPyroscope = {
  init: jest.fn(),
  start: jest.fn(),
};

jest.mock("@pyroscope/nodejs", () => mockPyroscope, { virtual: true });

describe("PyroscopeInitService", () => {
  let configService: ConfigService;

  const createConfig = (overrides: Record<string, string>) =>
    ({
      get: jest.fn((key: string) => overrides[key] ?? undefined),
    }) as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not initialize pyroscope when pyroscope.enabled is not true", () => {
    configService = createConfig({ "pyroscope.enabled": "false" });
    const service = new PyroscopeInitService(configService);

    service.onModuleInit();

    expect(mockPyroscope.init).not.toHaveBeenCalled();
    expect(mockPyroscope.start).not.toHaveBeenCalled();
  });

  it("does not initialize pyroscope when pyroscope.enabled is undefined", () => {
    configService = createConfig({});
    const service = new PyroscopeInitService(configService);

    service.onModuleInit();

    expect(mockPyroscope.init).not.toHaveBeenCalled();
    expect(mockPyroscope.start).not.toHaveBeenCalled();
  });

  it("initializes pyroscope with configured values", () => {
    configService = createConfig({
      "pyroscope.enabled": "true",
      "pyroscope.url": "http://pyro:4040",
      env: "staging",
    });
    const service = new PyroscopeInitService(configService);

    service.onModuleInit();

    expect(mockPyroscope.init).toHaveBeenCalledWith({
      serverAddress: "http://pyro:4040",
      appName: "farm-api",
      tags: { environment: "staging" },
    });
    expect(mockPyroscope.start).toHaveBeenCalled();
  });

  it("uses defaults for pyroscope.url and env when not configured", () => {
    configService = createConfig({
      "pyroscope.enabled": "true",
    });
    const service = new PyroscopeInitService(configService);

    service.onModuleInit();

    expect(mockPyroscope.init).toHaveBeenCalledWith({
      serverAddress: "http://pyroscope:4040",
      appName: "farm-api",
      tags: { environment: "development" },
    });
  });

  it("does not throw when @pyroscope/nodejs require fails", () => {
    jest.doMock("@pyroscope/nodejs", () => {
      throw new Error("module not found");
    });

    configService = createConfig({ "pyroscope.enabled": "true" });
    const service = new PyroscopeInitService(configService);

    expect(() => service.onModuleInit()).not.toThrow();
  });
});
