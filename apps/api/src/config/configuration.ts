import * as Joi from "joi";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: pkgVersion } = require("../../package.json") as {
  version: string;
};

/**
 * Configuration factory that maps environment variables to a configuration object.
 */
export const configuration = () => ({
  version: process.env.APP_VERSION || pkgVersion,
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
    poolConnectTimeout: parseInt(
      process.env.DATABASE_POOL_CONNECT_TIMEOUT ?? "5000",
      10,
    ),
    poolAcquireTimeout: parseInt(
      process.env.DATABASE_POOL_ACQUIRE_TIMEOUT ?? "30000",
      10,
    ),
    poolIdleTimeout: parseInt(
      process.env.DATABASE_POOL_IDLE_TIMEOUT ?? "10000",
      10,
    ),
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
    redisSentinelHosts: process.env.REDIS_SENTINEL_HOSTS || "",
    redisSentinelName: process.env.REDIS_SENTINEL_NAME || "mymaster",
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
    url: process.env.PROMETHEUS_URL,
  },
  tempo: {
    url: process.env.TEMPO_URL || process.env.JAEGER_URL,
  },
  loki: {
    url: process.env.LOKI_URL,
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
  ldap: {
    url: process.env.LDAP_URL || "",
    bindDn: process.env.LDAP_BIND_DN || "",
    bindPassword: process.env.LDAP_BIND_PASSWORD || "",
    searchBase: process.env.LDAP_SEARCH_BASE || "",
    searchFilter: process.env.LDAP_SEARCH_FILTER || "(uid={{username}})",
    adminGroup: process.env.LDAP_ADMIN_GROUP || "",
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
  swagger: {
    user: process.env.SWAGGER_USER || "farm",
    password: process.env.SWAGGER_PASSWORD || "farm",
  },
  gateway: {
    kong: {
      enabled: process.env.GATEWAY_KONG_ENABLED === "true",
      url: process.env.GATEWAY_KONG_URL || "",
      apiKey: process.env.GATEWAY_KONG_API_KEY || "",
    },
    aws: {
      enabled: process.env.GATEWAY_AWS_ENABLED === "true",
      region: process.env.GATEWAY_AWS_REGION || "",
      accessKeyId: process.env.GATEWAY_AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.GATEWAY_AWS_SECRET_ACCESS_KEY || "",
    },
  },
  registry: {
    type: process.env.REGISTRY_TYPE || "",
    url: process.env.REGISTRY_URL || "",
    credentials: process.env.REGISTRY_CREDENTIALS || "",
  },
  opencost: {
    url: process.env.OPENCOST_URL || "http://localhost:9090",
  },
  opa: {
    url: process.env.OPA_URL || "http://localhost:8181",
  },
  iac: {
    ingestToken: process.env.IAC_INGEST_TOKEN || "",
  },
  docs: {
    webhookSecret: process.env.DOCS_WEBHOOK_SECRET || "",
  },
  health: {
    heapThresholdMb:
      parseInt(process.env.HEALTH_HEAP_THRESHOLD_MB ?? "512", 10) || 512,
    rssThresholdMb:
      parseInt(process.env.HEALTH_RSS_THRESHOLD_MB ?? "1024", 10) || 1024,
  },
  elasticsearch: {
    url: process.env.ELASTICSEARCH_URL || "",
    username: process.env.ELASTICSEARCH_USERNAME || "",
    password: process.env.ELASTICSEARCH_PASSWORD || "",
  },
  app: {
    url: process.env.APP_URL || "http://localhost:3001",
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
  DATABASE_POOL_CONNECT_TIMEOUT: Joi.number().integer().min(100).default(5000),
  DATABASE_POOL_ACQUIRE_TIMEOUT: Joi.number().integer().min(100).default(30000),
  DATABASE_POOL_IDLE_TIMEOUT: Joi.number().integer().min(100).default(10000),
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
  REDIS_SENTINEL_HOSTS: Joi.string().allow("").default(""),
  REDIS_SENTINEL_NAME: Joi.string().default("mymaster"),
  CACHE_TTL: Joi.number().integer().min(1).default(30),
  SMTP_HOST: Joi.string().allow("").default(""),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow("").default(""),
  SMTP_PASS: Joi.string().allow("").default(""),
  SMTP_FROM: Joi.string().default("Farm <noreply@farm.local>"),
  GRAFANA_URL: Joi.string().allow("").default(""),
  PROMETHEUS_URL: Joi.string().uri().optional(),
  TEMPO_URL: Joi.string().uri().optional(),
  LOKI_URL: Joi.string().uri().optional(),
  // OAuth providers (all optional)
  GITHUB_CLIENT_ID: Joi.string().allow("").default(""),
  GITHUB_CLIENT_SECRET: Joi.string().allow("").default(""),
  GITHUB_CALLBACK_URL: Joi.string().allow("").default(""),
  GOOGLE_CLIENT_ID: Joi.string().allow("").default(""),
  GOOGLE_CLIENT_SECRET: Joi.string().allow("").default(""),
  GOOGLE_CALLBACK_URL: Joi.string().allow("").default(""),
  // LDAP / Active Directory (all optional)
  LDAP_URL: Joi.string().allow("").default(""),
  LDAP_BIND_DN: Joi.string().allow("").default(""),
  LDAP_BIND_PASSWORD: Joi.string().allow("").default(""),
  LDAP_SEARCH_BASE: Joi.string().allow("").default(""),
  LDAP_SEARCH_FILTER: Joi.string().allow("").default("(uid={{username}})"),
  LDAP_ADMIN_GROUP: Joi.string().allow("").default(""),
  // Webhook integrations (optional)
  SLACK_WEBHOOK_URL: Joi.string().allow("").default(""),
  TEAMS_WEBHOOK_URL: Joi.string().allow("").default(""),
  // Kubernetes (optional)
  KUBECONFIG_PATH: Joi.string().allow("").default(""),
  // Plugin directory
  PLUGINS_DIR: Joi.string().default("./plugins"),
  // Swagger Basic Auth
  SWAGGER_USER: Joi.string().default("farm"),
  SWAGGER_PASSWORD: Joi.string().default("farm"),
  // Gateway integration (all optional)
  GATEWAY_KONG_ENABLED: Joi.boolean().default(false),
  GATEWAY_KONG_URL: Joi.string().allow("").default(""),
  GATEWAY_KONG_API_KEY: Joi.string().allow("").default(""),
  GATEWAY_AWS_ENABLED: Joi.boolean().default(false),
  GATEWAY_AWS_REGION: Joi.string().allow("").default(""),
  GATEWAY_AWS_ACCESS_KEY_ID: Joi.string().allow("").default(""),
  GATEWAY_AWS_SECRET_ACCESS_KEY: Joi.string().allow("").default(""),
  // Registry integration (all optional)
  REGISTRY_TYPE: Joi.string()
    .valid("ecr", "gcr", "dockerhub", "harbor", "")
    .allow("")
    .default(""),
  REGISTRY_URL: Joi.string().allow("").default(""),
  REGISTRY_CREDENTIALS: Joi.string().allow("").default(""),
  // OpenCost integration (optional)
  OPENCOST_URL: Joi.string().uri().default("http://localhost:9090"),
  // OPA integration (optional)
  OPA_URL: Joi.string().uri().default("http://localhost:8181"),
  // IaC ingest token (optional — required when using Cultivator/Agronomist integration)
  IAC_INGEST_TOKEN: Joi.string().allow("").default(""),
  // Docs webhook HMAC secret (optional — when set, incoming webhook payloads are verified)
  DOCS_WEBHOOK_SECRET: Joi.string().allow("").optional(),
  // Health check memory thresholds (MB)
  HEALTH_HEAP_THRESHOLD_MB: Joi.number().integer().min(64).default(512),
  HEALTH_RSS_THRESHOLD_MB: Joi.number().integer().min(64).default(1024),
  // Elasticsearch (optional — advanced search backend)
  ELASTICSEARCH_URL: Joi.string().uri().allow("").optional(),
  ELASTICSEARCH_USERNAME: Joi.string().allow("").optional(),
  ELASTICSEARCH_PASSWORD: Joi.string().allow("").optional(),
  APP_URL: Joi.string().uri().default("http://localhost:3001"),
});
