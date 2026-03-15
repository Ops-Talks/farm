import { loggerConfigFactory } from "./logger.config";

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
