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
    OrganizationModule,
    SecurityInfraModule.forRoot(),
    HealthModule,
    EventsModule,
    EmailModule,
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
