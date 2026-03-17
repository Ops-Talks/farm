import * as Joi from "joi";

/**
 * Configuration factory that maps environment variables to a configuration object.
 */
export const configuration = () => ({
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT ?? "3000", 10) || 3000,
  log: {
    level: process.env.LOG_LEVEL || "info",
  },
  database: {
    type: process.env.DATABASE_TYPE || "postgres",
    host: process.env.DATABASE_HOST || "localhost",
    port: parseInt(process.env.DATABASE_PORT ?? "5432", 10) || 5432,
    username: process.env.DATABASE_USER || "postgres",
    password: process.env.DATABASE_PASSWORD || "postgres",
    name: process.env.DATABASE_NAME || "farm",
    synchronize: process.env.DATABASE_SYNC === "true",
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE ?? "10", 10) || 10,
  },
  auth: {
    jwtSecret:
      process.env.JWT_SECRET || "super-secret-key-change-me-in-production",
    jwtExpiresIn: process.env.JWT_EXPIRATION || "3600s",
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS || "*",
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? "60000", 10) || 60000,
    limit: parseInt(process.env.THROTTLE_LIMIT ?? "10", 10) || 10,
  },
  otel: {
    enabled: process.env.OTEL_ENABLED === "true",
    exporterEndpoint:
      process.env.OTEL_EXPORTER_ENDPOINT || "http://localhost:4318/v1/traces",
    serviceName: process.env.OTEL_SERVICE_NAME || "farm-api",
  },
  cache: {
    redisHost: process.env.REDIS_HOST || "",
    redisPort: parseInt(process.env.REDIS_PORT ?? "6379", 10) || 6379,
    ttl: parseInt(process.env.CACHE_TTL ?? "30", 10) || 30,
  },
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: parseInt(process.env.SMTP_PORT ?? "587", 10) || 587,
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "Farm <noreply@farm.local>",
  },
  grafana: {
    url: process.env.GRAFANA_URL || "",
  },
  prometheus: {
    url: process.env.PROMETHEUS_URL || "http://localhost:9090",
  },
  tracing: {
    jaegerUrl: process.env.JAEGER_URL || "http://localhost:16686",
  },
  loki: {
    url: process.env.LOKI_URL || "http://localhost:3100",
  },
  oauth: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      callbackUrl:
        process.env.GITHUB_CALLBACK_URL ||
        "http://localhost:3000/api/v1/auth/github/callback",
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackUrl:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:3000/api/v1/auth/google/callback",
    },
  },
  integrations: {
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || "",
    teamsWebhookUrl: process.env.TEAMS_WEBHOOK_URL || "",
  },
  kubernetes: {
    kubeconfigPath: process.env.KUBECONFIG_PATH || "",
  },
  plugins: {
    dir: process.env.PLUGINS_DIR || "./plugins",
  },
});

/**
 * Validation schema for environment variables using Joi.
 */
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test", "provision")
    .default("development"),
  PORT: Joi.number().default(3000),
  DATABASE_TYPE: Joi.string()
    .valid("postgres", "sqlite", "better-sqlite3")
    .default("postgres"),
  DATABASE_HOST: Joi.string().default("localhost"),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USER: Joi.string().default("postgres"),
  DATABASE_PASSWORD: Joi.string().default("postgres"),
  DATABASE_NAME: Joi.string().default("farm"),
  DATABASE_SYNC: Joi.boolean().default(false),
  DATABASE_POOL_SIZE: Joi.number().integer().min(1).max(100).default(10),
  LOG_LEVEL: Joi.string()
    .valid("error", "warn", "info", "http", "verbose", "debug", "silly")
    .default("info"),
  JWT_SECRET: Joi.string().when("NODE_ENV", {
    is: "production",
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().default("super-secret-key-change-me-in-production"),
  }),
  JWT_EXPIRATION: Joi.string().default("3600s"),
  ALLOWED_ORIGINS: Joi.string().default("*"),
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(10),
  OTEL_ENABLED: Joi.boolean().default(false),
  OTEL_EXPORTER_ENDPOINT: Joi.string()
    .uri()
    .default("http://localhost:4318/v1/traces"),
  OTEL_SERVICE_NAME: Joi.string().default("farm-api"),
  REDIS_HOST: Joi.string().allow("").default(""),
  REDIS_PORT: Joi.number().default(6379),
  CACHE_TTL: Joi.number().integer().min(1).default(30),
  SMTP_HOST: Joi.string().allow("").default(""),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow("").default(""),
  SMTP_PASS: Joi.string().allow("").default(""),
  SMTP_FROM: Joi.string().default("Farm <noreply@farm.local>"),
  GRAFANA_URL: Joi.string().allow("").default(""),
  PROMETHEUS_URL: Joi.string().uri().default("http://localhost:9090"),
  JAEGER_URL: Joi.string().uri().default("http://localhost:16686"),
  LOKI_URL: Joi.string().uri().default("http://localhost:3100"),
  // OAuth providers (all optional)
  GITHUB_CLIENT_ID: Joi.string().allow("").default(""),
  GITHUB_CLIENT_SECRET: Joi.string().allow("").default(""),
  GITHUB_CALLBACK_URL: Joi.string().allow("").default(""),
  GOOGLE_CLIENT_ID: Joi.string().allow("").default(""),
  GOOGLE_CLIENT_SECRET: Joi.string().allow("").default(""),
  GOOGLE_CALLBACK_URL: Joi.string().allow("").default(""),
  // Webhook integrations (optional)
  SLACK_WEBHOOK_URL: Joi.string().allow("").default(""),
  TEAMS_WEBHOOK_URL: Joi.string().allow("").default(""),
  // Kubernetes (optional)
  KUBECONFIG_PATH: Joi.string().allow("").default(""),
  // Plugin directory
  PLUGINS_DIR: Joi.string().default("./plugins"),
});
