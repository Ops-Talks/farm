/**
 * Tests for configuration factory and validation schema.
 *
 * The `configuration` function is evaluated at call time, so env vars set
 * before calling it are reflected in the returned object. This allows us to
 * exercise both the fallback (right-hand side of `||`) and the env-var
 * (left-hand side) branches for every option.
 *
 * The require() calls inside jest.isolateModules() are intentional: ts-jest
 * compiles to CommonJS, so synchronous require() is the only way to load a
 * freshly-reset module inside an isolateModules callback.
 */

// Store the original env so we can restore it after each test.
const originalEnv = { ...process.env };

afterEach(() => {
  // Restore env to its original state to avoid test pollution.
  Object.keys(process.env).forEach((key) => {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  });
  Object.assign(process.env, originalEnv);
});

describe("configuration", () => {
  it("returns default values when no environment variables are set", () => {
    // Clear relevant env vars so the fallback (`||`) branches are executed.
    const keysToDelete = [
      "NODE_ENV",
      "PORT",
      "LOG_LEVEL",
      "DATABASE_TYPE",
      "DATABASE_HOST",
      "DATABASE_PORT",
      "DATABASE_USER",
      "DATABASE_PASSWORD",
      "DATABASE_NAME",
      "DATABASE_SYNC",
      "DATABASE_POOL_SIZE",
      "JWT_SECRET",
      "JWT_EXPIRATION",
      "ALLOWED_ORIGINS",
      "THROTTLE_TTL",
      "THROTTLE_LIMIT",
      "OTEL_ENABLED",
      "OTEL_EXPORTER_ENDPOINT",
      "OTEL_SERVICE_NAME",
      "REDIS_HOST",
      "REDIS_PORT",
      "CACHE_TTL",
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_SECURE",
      "SMTP_USER",
      "SMTP_PASS",
      "SMTP_FROM",
      "GRAFANA_URL",
    ];
    keysToDelete.forEach((key) => delete process.env[key]);

    // Re-import the module after clearing env so the factory function is called
    // with clean state.
    jest.isolateModules(() => {
      const { configuration } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("./configuration") as typeof import("./configuration");
      const config = configuration();

      expect(config.env).toBe("development");
      expect(config.port).toBe(3000);
      expect(config.log.level).toBe("info");
      expect(config.database.type).toBe("postgres");
      expect(config.database.host).toBe("localhost");
      expect(config.database.port).toBe(5432);
      expect(config.database.username).toBe("postgres");
      expect(config.database.password).toBe("postgres");
      expect(config.database.name).toBe("farm");
      expect(config.database.synchronize).toBe(false);
      expect(config.database.poolSize).toBe(10);
      expect(config.auth.jwtSecret).toBe(
        "super-secret-key-change-me-in-production",
      );
      expect(config.auth.jwtExpiresIn).toBe("3600s");
      expect(config.cors.allowedOrigins).toBe("*");
      expect(config.throttle.ttl).toBe(60000);
      expect(config.throttle.limit).toBe(10);
      expect(config.otel.enabled).toBe(false);
      expect(config.otel.exporterEndpoint).toBe(
        "http://localhost:4318/v1/traces",
      );
      expect(config.otel.serviceName).toBe("farm-api");
      expect(config.cache.redisHost).toBe("");
      expect(config.cache.redisPort).toBe(6379);
      expect(config.cache.ttl).toBe(30);
      expect(config.smtp.host).toBe("");
      expect(config.smtp.port).toBe(587);
      expect(config.smtp.secure).toBe(false);
      expect(config.smtp.user).toBe("");
      expect(config.smtp.pass).toBe("");
      expect(config.smtp.from).toBe("Farm <noreply@farm.local>");
      expect(config.grafana.url).toBe("");
    });
  });

  it("uses environment variables when they are set (env-var branches)", () => {
    process.env.NODE_ENV = "production";
    process.env.PORT = "8080";
    process.env.LOG_LEVEL = "warn";
    process.env.DATABASE_TYPE = "sqlite";
    process.env.DATABASE_HOST = "db.example.com";
    process.env.DATABASE_PORT = "5433";
    process.env.DATABASE_USER = "myuser";
    process.env.DATABASE_PASSWORD = "mypassword";
    process.env.DATABASE_NAME = "mydb";
    process.env.DATABASE_SYNC = "true";
    process.env.DATABASE_POOL_SIZE = "5";
    process.env.JWT_SECRET = "my-super-secret";
    process.env.JWT_EXPIRATION = "7200s";
    process.env.ALLOWED_ORIGINS = "https://example.com";
    process.env.THROTTLE_TTL = "30000";
    process.env.THROTTLE_LIMIT = "50";
    process.env.OTEL_ENABLED = "true";
    process.env.OTEL_EXPORTER_ENDPOINT = "http://otel.example.com/traces";
    process.env.OTEL_SERVICE_NAME = "my-service";
    process.env.REDIS_HOST = "redis.example.com";
    process.env.REDIS_PORT = "6380";
    process.env.CACHE_TTL = "60";
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_SECURE = "true";
    process.env.SMTP_USER = "smtp-user";
    process.env.SMTP_PASS = "smtp-pass";
    process.env.SMTP_FROM = "no-reply@example.com";
    process.env.GRAFANA_URL = "https://grafana.example.com";

    jest.isolateModules(() => {
      const { configuration } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("./configuration") as typeof import("./configuration");
      const config = configuration();

      expect(config.env).toBe("production");
      expect(config.port).toBe(8080);
      expect(config.log.level).toBe("warn");
      expect(config.database.type).toBe("sqlite");
      expect(config.database.host).toBe("db.example.com");
      expect(config.database.port).toBe(5433);
      expect(config.database.username).toBe("myuser");
      expect(config.database.password).toBe("mypassword");
      expect(config.database.name).toBe("mydb");
      expect(config.database.synchronize).toBe(true);
      expect(config.database.poolSize).toBe(5);
      expect(config.auth.jwtSecret).toBe("my-super-secret");
      expect(config.auth.jwtExpiresIn).toBe("7200s");
      expect(config.cors.allowedOrigins).toBe("https://example.com");
      expect(config.throttle.ttl).toBe(30000);
      expect(config.throttle.limit).toBe(50);
      expect(config.otel.enabled).toBe(true);
      expect(config.otel.exporterEndpoint).toBe(
        "http://otel.example.com/traces",
      );
      expect(config.otel.serviceName).toBe("my-service");
      expect(config.cache.redisHost).toBe("redis.example.com");
      expect(config.cache.redisPort).toBe(6380);
      expect(config.cache.ttl).toBe(60);
      expect(config.smtp.host).toBe("smtp.example.com");
      expect(config.smtp.port).toBe(465);
      expect(config.smtp.secure).toBe(true);
      expect(config.smtp.user).toBe("smtp-user");
      expect(config.smtp.pass).toBe("smtp-pass");
      expect(config.smtp.from).toBe("no-reply@example.com");
      expect(config.grafana.url).toBe("https://grafana.example.com");
    });
  });

  it("DATABASE_SYNC is false when not set to 'true'", () => {
    process.env.DATABASE_SYNC = "false";

    jest.isolateModules(() => {
      const { configuration } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("./configuration") as typeof import("./configuration");
      expect(configuration().database.synchronize).toBe(false);
    });
  });

  it("SMTP_SECURE is false when not set to 'true'", () => {
    process.env.SMTP_SECURE = "0";

    jest.isolateModules(() => {
      const { configuration } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("./configuration") as typeof import("./configuration");
      expect(configuration().smtp.secure).toBe(false);
    });
  });

  it("OTEL_ENABLED is false when set to any value other than 'true'", () => {
    process.env.OTEL_ENABLED = "1";

    jest.isolateModules(() => {
      const { configuration } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("./configuration") as typeof import("./configuration");
      expect(configuration().otel.enabled).toBe(false);
    });
  });
});

describe("validationSchema", () => {
  it("is defined and is a Joi object schema", () => {
    jest.isolateModules(() => {
      const { validationSchema } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("./configuration") as typeof import("./configuration");
      expect(validationSchema).toBeDefined();
      // Joi schemas expose a `validate` function
      expect(typeof validationSchema.validate).toBe("function");
    });
  });

  it("validates successfully with all defaults", () => {
    jest.isolateModules(() => {
      const { validationSchema } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("./configuration") as typeof import("./configuration");
      const { error } = validationSchema.validate({});
      expect(error).toBeUndefined();
    });
  });

  it("rejects unknown NODE_ENV values", () => {
    jest.isolateModules(() => {
      const { validationSchema } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("./configuration") as typeof import("./configuration");
      const { error } = validationSchema.validate({ NODE_ENV: "unknown" });
      expect(error).toBeDefined();
    });
  });
});
