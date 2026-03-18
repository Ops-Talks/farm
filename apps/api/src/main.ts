import { NestFactory, Reflector } from "@nestjs/core";
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
import { loggerConfigFactory } from "./common/logger/logger.config";
import { initTracing, shutdownTracing } from "./common/telemetry/tracing";

// Initialize OpenTelemetry before NestJS bootstraps so auto-instrumentations
// can patch HTTP, Express, and TypeORM modules at import time.
initTracing();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

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

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new AllExceptionsFilter());

  const allowedOrigins =
    configService.get<string>("cors.allowedOrigins") || "*";
  app.enableCors({
    origin: allowedOrigins === "*" ? true : allowedOrigins.split(","),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  });

  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  const config = new DocumentBuilder()
    .setTitle("Farm API")
    .setDescription("The Farm platform API documentation")
    .setVersion(version as string)
    .addBearerAuth()
    .addTag("farm")
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);

  const swaggerUser = configService.get<string>("swagger.user") || "farm";
  const swaggerPass = configService.get<string>("swagger.password") || "farm";

  // Protect Swagger UI and JSON spec with HTTP Basic Auth.
  // In production set SWAGGER_USER and SWAGGER_PASSWORD env vars.
  app.use(
    ["/api/docs", "/api/docs-json", "/api/docs/swagger-ui-bundle.js", "/api/docs/swagger-ui-init.js", "/api/docs/swagger-ui.css"],
    (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
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
void bootstrap().catch(async () => {
  await shutdownTracing();
});
