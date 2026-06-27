import {
  Module,
  NestModule,
  MiddlewareConsumer,
  OnApplicationBootstrap,
} from "@nestjs/common";
import { register as promRegister, openMetricsContentType } from "prom-client";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_INTERCEPTOR, ModuleRef } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { ObservabilityInfraModule } from "./infra/observability/observability-infra.module";
import { DataInfraModule } from "./infra/data/data-infra.module";
import { SecurityInfraModule } from "./infra/security/security-infra.module";
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
import { EventsModule } from "./common/events/events.module";
import { EmailModule } from "./common/email/email.module";
import { configuration, validationSchema } from "./config/configuration";
import { RequestLoggerMiddleware } from "./common/middleware/request-logger.middleware";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";

import { OrgContextInterceptor } from "./common/interceptors/org-context.interceptor";

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
    DataInfraModule.forRoot(),
    // Direct import needed for OrgRequiredGuard + OrgContextInterceptor at app level.
    // Also registered via PluginManagerModule.forRoot() below for metadata discovery.
    OrganizationModule,
    SecurityInfraModule.forRoot(),
    HealthModule,
    EventsModule,
    EmailModule,
    PluginManagerModule.forRootModules([
      CatalogModule,
      DocumentationModule,
      AuthModule,
      EnvironmentsModule,
      TeamsModule,
      AuditLogModule,
      OrganizationModule,
      PipelinesModule,
      AlertingModule,
      IntegrationsModule,
      KubernetesModule,
      AnalyticsModule,
      HelmModule,
      CloudModule,
      TagPolicyModule,
      IstioModule,
      LinkerdModule,
      ApiSpecsModule,
      GatewayModule,
      RegistryModule,
      SloModule,
      IncidentModule,
      DashboardModule,
      ServiceTemplateModule,
      EnvironmentRequestModule,
      FinOpsModule,
      FeaturesModule,
      SearchModule,
      SetupModule,
      OpaModule,
      IacModule,
      ElasticsearchModule,
      ElasticsearchIndexModule,
      ScorecardsModule,
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
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
