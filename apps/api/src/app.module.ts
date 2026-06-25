import {
  Module,
  NestModule,
  MiddlewareConsumer,
  OnApplicationBootstrap,
  Logger,
} from "@nestjs/common";
import { register as promRegister, openMetricsContentType } from "prom-client";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerModule } from "@nestjs/throttler";
import { CacheModule } from "@nestjs/cache-manager";
import { APP_GUARD, APP_INTERCEPTOR, ModuleRef } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { ObservabilityInfraModule } from "./infra/observability/observability-infra.module";
import { DatabaseModule } from "./common/database/database.module";
import { CircuitBreakerModule } from "./common/circuit-breaker/circuit-breaker.module";
import { HttpModule } from "./common/http/http.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PluginManagerModule } from "./modules/plugin-manager/plugin-manager.module";
import { PluginManagerService } from "./modules/plugin-manager/plugin-manager.service";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { DocumentationModule } from "./modules/documentation/documentation.module";
import { AuthModule } from "./modules/auth/auth.module";
import { EnvironmentsModule } from "./modules/environments/environments.module";
import { TeamsModule } from "./modules/teams/teams.module";
import { AuditLogModule } from "./modules/audit-log/audit-log.module";
import { OrganizationModule } from "./modules/organization/organization.module";
import { PipelinesModule } from "./modules/pipelines/pipelines.module";
import { AlertingModule } from "./modules/alerting/alerting.module";
import { IntegrationsModule } from "./modules/integrations/integrations.module";
import { KubernetesModule } from "./modules/kubernetes/kubernetes.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { HelmModule } from "./modules/helm/helm.module";
import { CloudModule } from "./modules/cloud/cloud.module";
import { TagPolicyModule } from "./modules/tag-policy/tag-policy.module";
import { IstioModule } from "./modules/istio/istio.module";
import { LinkerdModule } from "./modules/linkerd/linkerd.module";
import { ApiSpecsModule } from "./modules/api-specs/api-specs.module";
import { GatewayModule } from "./modules/gateway/gateway.module";
import { RegistryModule } from "./modules/registry/registry.module";
import { SloModule } from "./modules/slo/slo.module";
import { IncidentModule } from "./modules/incident/incident.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { ServiceTemplateModule } from "./modules/service-template/service-template.module";
import { EnvironmentRequestModule } from "./modules/environment-request/environment-request.module";
import { FinOpsModule } from "./modules/finops/finops.module";
import { FeaturesModule } from "./modules/features/features.module";
import { SearchModule } from "./modules/search/search.module";
import { SetupModule } from "./modules/setup/setup.module";
import { OpaModule } from "./modules/opa/opa.module";
import { IacModule } from "./modules/iac/iac.module";
import { ElasticsearchModule } from "./modules/elasticsearch/elasticsearch.module";
import { ElasticsearchIndexModule } from "./modules/elasticsearch-index/elasticsearch-index.module";
import { ScorecardsModule } from "./modules/scorecards/scorecards.module";
import { HealthModule } from "./common/health/health.module";
import { QueuesModule } from "./common/queues/queues.module";
import { EventsModule } from "./common/events/events.module";
import { EmailModule } from "./common/email/email.module";
import { configuration, validationSchema } from "./config/configuration";
import { RequestLoggerMiddleware } from "./common/middleware/request-logger.middleware";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";

import { OrgContextInterceptor } from "./common/interceptors/org-context.interceptor";
import { PerUserThrottlerGuard } from "./common/guards/per-user-throttler.guard";
import KeyvRedis from "@keyv/redis";

// Switch the default Prometheus registry to OpenMetrics content type so that
// histograms with enableExemplars=true can attach OpenTelemetry exemplars.
// Guarded against prom-client versions that may not expose setContentType.
const _promSetContentType = (
  promRegister as unknown as { setContentType?: (ct: string) => void }
).setContentType;
if (typeof _promSetContentType === "function") {
  _promSetContentType.call(promRegister, openMetricsContentType);
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: ".",
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    ScheduleModule.forRoot(),
    ObservabilityInfraModule,
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
          migrations: [__dirname + "/migrations/*.{ts,js}"],
          migrationsRun: false,
          extra: {
            max: configService.get<number>("database.poolSize") ?? 10,
            connectionTimeoutMillis:
              configService.get<number>("database.poolConnectTimeout") ?? 5000,
            idleTimeoutMillis:
              configService.get<number>("database.poolIdleTimeout") ?? 10000,
            statement_timeout:
              configService.get<number>("database.statementTimeout") ?? 30000,
          },
        };
      },
    }),
    OrganizationModule,
    CircuitBreakerModule,
    HttpModule,
    DatabaseModule,
    HealthModule,
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
          configService.get<string>("cache.redisSentinelName") ?? "mymaster";
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
    QueuesModule.register(),
    EventsModule,
    EmailModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          { name: "short", ttl: 1000, limit: 5 },
          { name: "long", ttl: 60000, limit: 100 },
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
      {
        metadata: {
          name: "core-audit-log",
          version: "1.0.0",
          description: "Immutable audit log trail for system actions",
        },
        module: AuditLogModule,
      },
      {
        metadata: {
          name: "core-organization",
          version: "1.0.0",
          description: "Organization and multi-tenant management",
        },
        module: OrganizationModule,
      },
      {
        metadata: {
          name: "core-pipelines",
          version: "1.0.0",
          description: "Pipeline definition and execution",
        },
        module: PipelinesModule,
      },
      {
        metadata: {
          name: "core-alerting",
          version: "1.0.0",
          description: "Alerting rules management",
        },
        module: AlertingModule,
      },
      {
        metadata: {
          name: "core-integrations",
          version: "1.0.0",
          description: "Slack and Teams webhook integrations",
        },
        module: IntegrationsModule,
      },
      {
        metadata: {
          name: "core-kubernetes",
          version: "1.0.0",
          description: "Kubernetes cluster discovery",
        },
        module: KubernetesModule,
      },
      {
        metadata: {
          name: "core-analytics",
          version: "1.0.0",
          description: "Catalog analytics, DORA metrics, and usage reports",
        },
        module: AnalyticsModule,
      },
      {
        metadata: {
          name: "core-helm",
          version: "1.0.0",
          description: "Helm chart integration and release discovery",
        },
        module: HelmModule,
      },
      {
        metadata: {
          name: "cloud",
          version: "1.0.0",
          description: "Cloud provider integrations (AWS, GCP, Azure)",
        },
        module: CloudModule,
      },
      {
        metadata: {
          name: "core-tag-governance",
          version: "1.0.0",
          description:
            "Resource tagging governance, compliance audit, and violation tracking",
        },
        module: TagPolicyModule,
      },
      {
        metadata: {
          name: "core-istio",
          version: "1.0.0",
          description:
            "Istio service mesh integration: traffic metrics, topology, security posture, and canary traffic control",
        },
        module: IstioModule,
      },
      {
        metadata: {
          name: "core-linkerd",
          version: "1.0.0",
          description:
            "Linkerd 2.x service mesh integration: traffic metrics, topology, mTLS posture, and ServiceProfile route management",
        },
        module: LinkerdModule,
      },
      {
        metadata: {
          name: "core-api-specs",
          version: "1.0.0",
          description:
            "API catalog and lifecycle management: spec versioning, consumer tracking, and structural diff",
        },
        module: ApiSpecsModule,
      },
      {
        metadata: {
          name: "core-gateway",
          version: "1.0.0",
          description: "API Gateway integration (Kong, AWS)",
        },
        module: GatewayModule,
      },
      {
        metadata: {
          name: "core-registry",
          version: "1.0.0",
          description:
            "Container registry integration (ECR, GCP Artifact Registry, Docker Hub, Harbor)",
        },
        module: RegistryModule,
      },
      {
        metadata: {
          name: "core-slo",
          version: "1.0.0",
          description:
            "SLO management, error budget calculation, and burn rate monitoring",
        },
        module: SloModule,
      },
      {
        metadata: {
          name: "core-incidents",
          version: "1.0.0",
          description:
            "Incident lifecycle management with timeline and post-mortems",
        },
        module: IncidentModule,
      },
      {
        metadata: {
          name: "core-dashboards",
          version: "1.0.0",
          description: "Custom dashboard builder with configurable widget grid",
        },
        module: DashboardModule,
      },
      {
        metadata: {
          name: "core-service-templates",
          version: "1.0.0",
          description:
            "Service templates and golden paths for developer self-service scaffolding",
        },
        module: ServiceTemplateModule,
      },
      {
        metadata: {
          name: "core-environment-requests",
          version: "1.0.0",
          description:
            "Self-service environment provisioning with approval workflows",
        },
        module: EnvironmentRequestModule,
      },
      {
        metadata: {
          name: "core-finops",
          version: "1.0.0",
          description:
            "FinOps: Infracost pipeline integration and OpenCost component cost visibility",
        },
        module: FinOpsModule,
      },
      {
        metadata: {
          name: "core-features",
          version: "1.0.0",
          description:
            "Bulk feature availability endpoint for all optional platform integrations",
        },
        module: FeaturesModule,
      },
      {
        metadata: {
          name: "core-search",
          version: "1.0.0",
          description:
            "Quick search across catalog, teams, documentation, environments, and pipelines",
        },
        module: SearchModule,
      },
      {
        metadata: {
          name: "core-setup",
          version: "1.0.0",
          description:
            "Admin setup checklist with real-time completion status and dismissal support",
        },
        module: SetupModule,
      },
      {
        metadata: {
          name: "core-opa",
          version: "1.0.0",
          description:
            "Open Policy Agent (OPA) integration for on-demand policy evaluation",
        },
        module: OpaModule,
      },
      {
        metadata: {
          name: "core-iac",
          version: "1.0.0",
          description:
            "IaC stack management, run ingestion (Cultivator), and module drift tracking (Agronomist)",
        },
        module: IacModule,
      },
      {
        metadata: {
          name: "core-elasticsearch",
          version: "1.0.0",
          description:
            "Elasticsearch search indexing and advanced search backend",
        },
        module: ElasticsearchModule,
      },
      {
        metadata: {
          name: "core-elasticsearch-index",
          version: "1.0.0",
          description:
            "Link Elasticsearch index patterns to catalog components",
        },
        module: ElasticsearchIndexModule,
      },
      {
        metadata: {
          name: "core-scorecards",
          version: "1.0.0",
          description:
            "Component scorecard evaluation, maturity levels, and criterion tracking",
        },
        module: ScorecardsModule,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: PerUserThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: OrgContextInterceptor,
    },
  ],
})
export class AppModule implements NestModule, OnApplicationBootstrap {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Scans the plugins directory on application startup and registers
   * any valid external plugin manifests found.
   */
  onApplicationBootstrap(): void {
    try {
      const pluginManagerService = this.moduleRef.get(PluginManagerService, {
        strict: false,
      });
      const pluginsDir =
        this.configService.get<string>("plugins.dir") || "./plugins";
      pluginManagerService.scanDirectory(pluginsDir);
    } catch {
      // PluginManagerService may not be available in minimal test setups
    }
  }

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, RequestLoggerMiddleware)
      .exclude("api/health{*path}")
      .forRoutes("{*path}");
  }
}
