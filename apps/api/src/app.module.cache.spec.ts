/**
 * Unit tests for the AppModule CacheModule.registerAsync useFactory.
 *
 * The factory is reproduced here from app.module.ts so it can be tested
 * in isolation without bootstrapping the full NestJS application. The
 * @keyv/redis module is mocked at the top level so Jest can intercept the
 * static import.
 */
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const mockKeyvRedisConstructor = jest.fn().mockImplementation(function (
  this: Record<string, unknown>,
  arg: unknown,
) {
  this._arg = arg;
});

jest.mock("@keyv/redis", () => ({
  __esModule: true,
  default: mockKeyvRedisConstructor,
}));

// Mirror of the factory in app.module.ts (kept in sync manually).
function cacheFactory(configService: ConfigService): {
  stores?: unknown[];
  ttl: number;
} {
  const logger = new Logger("CacheModule");
  const ttl = (configService.get<number>("cache.ttl") ?? 30) * 1000;
  const sentinelHosts = configService.get<string>("cache.redisSentinelHosts");
  const sentinelName =
    configService.get<string>("cache.redisSentinelName") ?? "mymaster";
  const redisHost = configService.get<string>("cache.redisHost");

  if (sentinelHosts) {
    const sentinels = sentinelHosts.split(",").map((h) => {
      const [host, port] = h.trim().split(":");
      return { host, port: parseInt(port ?? "26379", 10) };
    });
    logger.log("CacheModule: using Redis Sentinel");
    return {
      stores: [new mockKeyvRedisConstructor({ sentinels, name: sentinelName })],
      ttl,
    };
  }

  if (redisHost) {
    const redisPort = configService.get<number>("cache.redisPort") ?? 6379;
    logger.log("CacheModule: using Redis single-host");
    return {
      stores: [
        new mockKeyvRedisConstructor(`redis://${redisHost}:${redisPort}`),
      ],
      ttl,
    };
  }

  logger.warn(
    "CacheModule: no REDIS_HOST configured — using in-memory cache store. " +
      "Not suitable for multi-replica deployments.",
  );
  return { ttl };
}

function buildConfig(values: Record<string, unknown>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe("AppModule CacheModule factory", () => {
  beforeEach(() => {
    mockKeyvRedisConstructor.mockClear();
  });

  it("returns a Sentinel-backed store when redisSentinelHosts is set", () => {
    const config = buildConfig({
      "cache.ttl": 60,
      "cache.redisSentinelHosts": "sentinel1:26379,sentinel2:26379",
      "cache.redisSentinelName": "master",
    });

    const result = cacheFactory(config);

    expect(result.ttl).toBe(60_000);
    expect(result.stores).toHaveLength(1);
    expect(mockKeyvRedisConstructor).toHaveBeenCalledTimes(1);
    expect(mockKeyvRedisConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "master",
        sentinels: [
          { host: "sentinel1", port: 26379 },
          { host: "sentinel2", port: 26379 },
        ],
      }),
    );
  });

  it("defaults sentinelName to 'mymaster' when not configured", () => {
    const config = buildConfig({
      "cache.redisSentinelHosts": "s1:26379",
    });

    cacheFactory(config);

    expect(mockKeyvRedisConstructor).toHaveBeenCalledWith(
      expect.objectContaining({ name: "mymaster" }),
    );
  });

  it("returns a single-host Redis store when only redisHost is set", () => {
    const config = buildConfig({
      "cache.ttl": 10,
      "cache.redisHost": "redis-host",
      "cache.redisPort": 6380,
    });

    const result = cacheFactory(config);

    expect(result.ttl).toBe(10_000);
    expect(result.stores).toHaveLength(1);
    expect(mockKeyvRedisConstructor).toHaveBeenCalledWith(
      "redis://redis-host:6380",
    );
  });

  it("defaults Redis port to 6379 when redisPort is not configured", () => {
    const config = buildConfig({ "cache.redisHost": "redis" });

    cacheFactory(config);

    expect(mockKeyvRedisConstructor).toHaveBeenCalledWith("redis://redis:6379");
  });

  it("returns an in-memory store when neither Sentinel nor host is configured", () => {
    const config = buildConfig({ "cache.ttl": 5 });

    const result = cacheFactory(config);

    expect(result.ttl).toBe(5_000);
    expect(result.stores).toBeUndefined();
    expect(mockKeyvRedisConstructor).not.toHaveBeenCalled();
  });

  it("Sentinel branch takes priority over single-host when both are set", () => {
    const config = buildConfig({
      "cache.redisSentinelHosts": "s1:26379",
      "cache.redisHost": "redis-host",
    });

    const result = cacheFactory(config);

    expect(result.stores).toHaveLength(1);
    expect(mockKeyvRedisConstructor).toHaveBeenCalledTimes(1);
    expect(mockKeyvRedisConstructor).toHaveBeenCalledWith(
      expect.objectContaining({ name: "mymaster" }),
    );
  });
});
