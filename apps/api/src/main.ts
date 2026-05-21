import { NestFactory, Reflector } from "@nestjs/core";
import * as express from "express";
import {
  ValidationPipe,
  ClassSerializerInterceptor,
  VersioningType,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { WinstonModule } from "nest-winston";
import helmet from "helmet";
import { AppModule } from "./app.module";
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const { version } = require("../package.json");
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";
import { ApiVersionInterceptor } from "./common/interceptors/api-version.interceptor";
import { loggerConfigFactory } from "./common/logger/logger.config";
import { initTracing, shutdownTracing } from "./common/telemetry/tracing";

// Initialize OpenTelemetry before NestJS bootstraps so auto-instrumentations
// can patch HTTP, Express, and TypeORM modules at import time.
initTracing();

// Safety net for async failures that escape all try/catch boundaries.
// Uses console.error because the Winston logger is not yet available at this
// point in the process lifecycle. Both handlers initiate a graceful OTel
// shutdown before exiting so in-flight spans are flushed.
process.on("unhandledRejection", (reason: unknown) => {
  const message =
    reason instanceof Error ? (reason.stack ?? reason.message) : String(reason);
  console.error("[FatalError] Unhandled promise rejection", {
    reason: message,
  });
  void shutdownTracing().finally(() => process.exit(1));
});

process.on("uncaughtException", (error: Error) => {
  console.error("[FatalError] Uncaught exception", {
    message: error.message,
    stack: error.stack,
  });
  void shutdownTracing().finally(() => process.exit(1));
});

// Initialize Pyroscope continuous profiling when enabled via environment variable.
if (process.env.PYROSCOPE_ENABLED === "true") {
  try {
    // Dynamic import so that the package is only loaded when profiling is active.
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
    const Pyroscope = require("@pyroscope/nodejs");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    Pyroscope.init({
      serverAddress: process.env.PYROSCOPE_URL ?? "http://pyroscope:4040",
      appName: "farm-api",
      tags: { environment: process.env.NODE_ENV ?? "development" },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    Pyroscope.start();
  } catch (err) {
    console.warn(
      "Pyroscope profiling could not be initialized (native dependency may be missing):",
      (err as Error).message,
    );
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    // Disable the default 100 kb body-parser so we can apply per-path limits.
    bodyParser: false,
  });

  // OTLP trace payloads from the browser SDK can be large (many batched spans).
  app.use("/api/v1/traces/ingest", express.json({ limit: "10mb" }));
  // Capture the raw request body on the webhook route so HMAC verification
  // can hash the exact bytes GitHub sent instead of re-serialized JSON.
  app.use(
    "/api/v1/docs/webhook",
    express.json({
      limit: "1mb",
      verify: (
        req: express.Request & { rawBody?: Buffer },
        _res: express.Response,
        buf: Buffer,
      ) => {
        req.rawBody = buf;
      },
    }),
  );
  // Capture raw body for all inbound CI/CD webhook receivers so that HMAC
  // signatures (e.g., x-hub-signature-256 from GitHub) can be verified against
  // the exact bytes that were sent.
  app.use(
    "/api/v1/webhooks",
    express.json({
      limit: "1mb",
      verify: (
        req: express.Request & { rawBody?: Buffer },
        _res: express.Response,
        buf: Buffer,
      ) => {
        req.rawBody = buf;
      },
    }),
  );
  // Standard limit for all other routes.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  const configService = app.get(ConfigService);
  const env = configService.get<string>("env") || "development";
  const logLevel = configService.get<string>("log.level") || "info";

  const logger = WinstonModule.createLogger(loggerConfigFactory(env, logLevel));
  app.useLogger(logger);

  app.use(helmet());
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new ApiVersionInterceptor(),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const allowedOrigins =
    configService.get<string>("cors.allowedOrigins") || "*";
  app.enableCors({
    origin: allowedOrigins === "*" ? true : allowedOrigins.split(","),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  });

  // S519 — Legacy redirect middleware.
  // Intercepts requests to /api/{path} where {path} does NOT start with
  // a version segment, "docs", "docs-json", "health", or "metrics" and issues
  // a 308 Permanent Redirect to /api/v1/{path} so old clients are seamlessly
  // forwarded to the versioned base URL without losing their HTTP method or body.
  app.use(
    (
      req: import("express").Request,
      res: import("express").Response,
      next: import("express").NextFunction,
    ) => {
      const legacyPath = /^\/api\/(?!v\d|docs|health|metrics|docs-json)(.*)$/.exec(req.path);
      if (legacyPath) {
        const redirectTarget = `/api/v1/${legacyPath[1]}`;
        const location = req.url.replace(req.path, redirectTarget);
        res.setHeader("Deprecation", "true");
        res.setHeader("Link", `<${redirectTarget}>; rel="successor-version"`);
        res.redirect(308, location);
        return;
      }
      next();
    },
  );

  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  const config = new DocumentBuilder()
    .setTitle("Farm API")
    .setDescription("The Farm platform API documentation")
    .setVersion(version as string)
    .addServer("/api/v1", "Versioned API (current)")
    .addServer("/api", "Deprecated alias (redirects to /api/v1)")
    .addBearerAuth()
    .addApiKey(
      { type: "apiKey", in: "header", name: "x-ingest-token" },
      "IacIngestToken",
    )
    .addTag("Health", "Application health and readiness probes")
    .addTag("Authentication", "JWT auth, registration, and profile management")
    .addTag("User Management", "Platform-wide user management dashboard")
    .addTag("Organizations", "Organization and multi-tenant management")
    .addTag("Invitations", "Organization invitation workflows")
    .addTag("Catalog", "Software component registry")
    .addTag("Teams", "Team management and membership")
    .addTag("Environments", "Deployment environment management")
    .addTag("Deployments", "Component deployment tracking")
    .addTag("Pipelines", "CI/CD pipeline definitions and run history")
    .addTag("IaC", "Infrastructure-as-Code stack management and ingest")
    .addTag("IaC Modules", "IaC module catalog and versioning")
    .addTag(
      "Kubernetes",
      "Kubernetes cluster discovery and workload management",
    )
    .addTag("Helm", "Helm release discovery and synchronization")
    .addTag("Istio", "Istio service mesh integration")
    .addTag("Linkerd", "Linkerd 2.x service mesh integration")
    .addTag("Gateway", "API gateway route discovery and health checks")
    .addTag("Registry", "Container registry queries and vulnerability scanning")
    .addTag("Scorecards", "Component maturity scorecard evaluation")
    .addTag("SLOs", "Service Level Objective management")
    .addTag("Incidents", "Production incident management")
    .addTag("Post-Mortems", "Incident post-mortem analysis")
    .addTag("Alerting Rules", "PromQL-based alerting rule management")
    .addTag("Analytics", "Catalog health, DORA metrics, and usage reports")
    .addTag("Cloud", "Cloud resource discovery and cost management")
    .addTag("Dashboards", "Custom dashboard and widget management")
    .addTag("Documentation", "Technical documentation management")
    .addTag("Service Templates", "Service template and scaffold workflows")
    .addTag("OPA", "Open Policy Agent integration")
    .addTag("Observability", "Application observability and metrics")
    .addTag("Queues", "BullMQ queue monitoring and job management")
    .addTag("Webhooks", "Inbound CI/CD webhook receivers")
    .addTag("ArgoCD", "ArgoCD application management")
    .addTag("CircleCI", "CircleCI pipeline management")
    .addTag("Jenkins", "Jenkins job and build management")
    .addTag("Travis CI", "Travis CI build management")
    .addTag("Integrations", "CI/CD integration management")
    .addTag(
      "Integration Credentials",
      "Encrypted integration credential management",
    )
    .addTag("Tag Policies", "Cloud resource tag governance")
    .addTag("Elasticsearch Indices", "Elasticsearch index pattern management")
    .addTag("Plugins", "Plugin manager and registry")
    .addTag("Audit Log", "Immutable audit trail")
    .addTag("Features", "Platform feature availability flags")
    .addTag("Search", "Full-text and faceted search across catalog entities")
    .addTag("Setup", "Admin setup checklist")
    .addTag("FinOps", "Cost allocation and cloud spend management")
    .addTag(
      "Environment Requests",
      "Developer self-service environment requests",
    )
    .addTag("Traces", "OTLP trace ingestion")
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);

  const swaggerUser = configService.get<string>("swagger.user") || "farm";
  const swaggerPass = configService.get<string>("swagger.password") || "farm";

  // Protect Swagger UI and JSON spec with HTTP Basic Auth.
  // In production set SWAGGER_USER and SWAGGER_PASSWORD env vars.
  app.use(
    [
      "/api/docs",
      "/api/docs-json",
      "/api/docs/swagger-ui-bundle.js",
      "/api/docs/swagger-ui-init.js",
      "/api/docs/swagger-ui.css",
    ],
    (
      req: import("express").Request,
      res: import("express").Response,
      next: import("express").NextFunction,
    ) => {
      const authorization = req.headers["authorization"];
      if (authorization) {
        const [scheme, encoded] = authorization.split(" ");
        if (scheme?.toLowerCase() === "basic" && encoded) {
          const decoded = Buffer.from(encoded, "base64").toString("utf8");
          const [user, pass] = decoded.split(":");
          if (user === swaggerUser && pass === swaggerPass) {
            return next();
          }
        }
      }
      res.setHeader("WWW-Authenticate", 'Basic realm="Farm API Docs"');
      res.status(401).send("Unauthorized");
    },
  );

  SwaggerModule.setup("api/docs", app, documentFactory);

  const port = configService.get<number>("port") || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}/api`);
}
void bootstrap().catch(async (error: unknown) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error("[FatalError] Bootstrap failed", { error: message });
  await shutdownTracing();
  process.exit(1);
});
