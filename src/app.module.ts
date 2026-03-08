import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { CacheModule } from "@nestjs/cache-manager";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
} from "@willsoto/nestjs-prometheus";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PluginManagerModule } from "./plugin-manager/plugin-manager.module";
import { CatalogModule } from "./catalog/catalog.module";
import { DocumentationModule } from "./documentation/documentation.module";
import { AuthModule } from "./auth/auth.module";
import { EnvironmentsModule } from "./environments/environments.module";
import { TeamsModule } from "./teams/teams.module";
import { HealthModule } from "./common/health/health.module";
import { QueuesModule } from "./common/queues/queues.module";
import { EventsModule } from "./common/events/events.module";
import { EmailModule } from "./common/email/email.module";
import { configuration, validationSchema } from "./config/configuration";
import { RequestLoggerMiddleware } from "./common/middleware/request-logger.middleware";
import { MetricsInterceptor } from "./common/interceptors/metrics.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    PrometheusModule.register({
      path: "/metrics",
      defaultMetrics: { enabled: true },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: configService.get<string>("database.type") as "postgres",
        host: configService.get<string>("database.host"),
        port: configService.get<number>("database.port"),
        username: configService.get<string>("database.username"),
        password: configService.get<string>("database.password"),
        database: configService.get<string>("database.name"),
        synchronize: configService.get<boolean>("database.synchronize"),
        autoLoadEntities: true,
        migrations: [__dirname + "/migrations/*.{.ts,.js}"],
        migrationsRun: configService.get<string>("env") === "production",
        extra:
          configService.get<string>("database.type") === "postgres"
            ? { max: configService.get<number>("database.poolSize") ?? 10 }
            : undefined,
      }),
    }),
    HealthModule,
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get<string>("cache.redisHost");
        const ttl = (configService.get<number>("cache.ttl") ?? 30) * 1000;

        if (redisHost) {
          const KeyvRedis = (await import("@keyv/redis")).default;
          const redisPort =
            configService.get<number>("cache.redisPort") ?? 6379;
          return {
            stores: [new KeyvRedis(`redis://${redisHost}:${redisPort}`)],
            ttl,
          };
        }

        return { ttl };
      },
    }),
    QueuesModule.register(),
    EventsModule,
    EmailModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>("throttle.ttl") ?? 60000,
            limit: configService.get<number>("throttle.limit") ?? 10,
          },
        ],
        skipIf: () =>
          configService.get<string>("env") === "test" ||
          process.env.NODE_ENV === "test",
      }),
    }),
    PluginManagerModule.forRoot([
      {
        metadata: {
          name: "core-catalog",
          version: "1.0.0",
          description: "Software catalog management",
        },
        module: CatalogModule,
      },
      {
        metadata: {
          name: "core-documentation",
          version: "1.0.0",
          description: "Technical documentation management",
        },
        module: DocumentationModule,
      },
      {
        metadata: {
          name: "core-auth",
          version: "1.0.0",
          description: "Authentication and authorization",
        },
        module: AuthModule,
      },
      {
        metadata: {
          name: "core-environments",
          version: "1.0.0",
          description: "Environment and deployment management",
        },
        module: EnvironmentsModule,
      },
      {
        metadata: {
          name: "core-teams",
          version: "1.0.0",
          description: "Team and ownership management",
        },
        module: TeamsModule,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    makeCounterProvider({
      name: "http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status_code"],
    }),
    makeHistogramProvider({
      name: "http_request_duration_seconds",
      help: "HTTP request duration in seconds",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }),
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .exclude("api/health{*path}")
      .forRoutes("{*path}");
  }
}
