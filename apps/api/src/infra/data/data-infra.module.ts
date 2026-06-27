import { DynamicModule, Global, Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import KeyvRedis from "@keyv/redis";
import { CacheModule } from "@nestjs/cache-manager";
import { DatabaseModule } from "../../common/database/database.module";
import { QueuesModule } from "../../common/queues/queues.module";
import { join } from "path";

@Global()
@Module({})
export class DataInfraModule {
  static forRoot(): DynamicModule {
    return {
      module: DataInfraModule,
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const env = configService.get<string>("env");
            const rawSync = configService.get<boolean>("database.synchronize");
            if (rawSync && env !== "test") {
              throw new Error(
                "DATABASE_SYNC=true is only permitted when NODE_ENV=test. " +
                  "All schema changes in non-test environments must go through migrations.",
              );
            }
            const synchronize = rawSync === true && env === "test";
            return {
              type: configService.get<string>("database.type") as "postgres",
              host: configService.get<string>("database.host"),
              port: configService.get<number>("database.port"),
              username: configService.get<string>("database.username"),
              password: configService.get<string>("database.password"),
              database: configService.get<string>("database.name"),
              synchronize,
              dropSchema: synchronize,
              autoLoadEntities: true,
              migrations: [join(__dirname, "../../migrations/*.{ts,js}")],
              migrationsRun: false,
              extra: {
                max: configService.get<number>("database.poolSize") ?? 10,
                connectionTimeoutMillis:
                  configService.get<number>("database.poolConnectTimeout") ??
                  5000,
                idleTimeoutMillis:
                  configService.get<number>("database.poolIdleTimeout") ??
                  10000,
                statement_timeout:
                  configService.get<number>("database.statementTimeout") ??
                  30000,
              },
            };
          },
        }),
        CacheModule.registerAsync({
          isGlobal: true,
          imports: [ConfigModule],
          inject: [ConfigService],
          // eslint-disable-next-line @typescript-eslint/require-await -- async is required for TypeScript to accept the union return type against CacheModuleAsyncOptions
          useFactory: async (configService: ConfigService) => {
            const logger = new Logger("CacheModule");
            const ttl = (configService.get<number>("cache.ttl") ?? 30) * 1000;
            const sentinelHosts = configService.get<string>(
              "cache.redisSentinelHosts",
            );
            const sentinelName =
              configService.get<string>("cache.redisSentinelName") ??
              "mymaster";
            const redisHost = configService.get<string>("cache.redisHost");

            if (sentinelHosts) {
              const sentinels = sentinelHosts.split(",").map((h) => {
                const [host, port] = h.trim().split(":");
                return { host, port: parseInt(port ?? "26379", 10) };
              });
              logger.log("CacheModule: using Redis Sentinel");
              return {
                stores: [
                  new KeyvRedis({
                    sentinels,
                    name: sentinelName,
                  } as ConstructorParameters<typeof KeyvRedis>[0]),
                ],
                ttl,
              };
            }

            if (redisHost) {
              const redisPort =
                configService.get<number>("cache.redisPort") ?? 6379;
              logger.log("CacheModule: using Redis single-host");
              return {
                stores: [new KeyvRedis(`redis://${redisHost}:${redisPort}`)],
                ttl,
              };
            }

            logger.warn(
              "CacheModule: no REDIS_HOST configured — using in-memory cache store. " +
                "Not suitable for multi-replica deployments.",
            );
            return { ttl };
          },
        }),
        DatabaseModule,
        QueuesModule.register(),
      ],
      exports: [TypeOrmModule, CacheModule, DatabaseModule, QueuesModule],
    };
  }
}
