import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "./../src/app.module";

describe("AppController (e2e)", () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    // Force better-sqlite3 for E2E tests
    process.env.DATABASE_TYPE = "better-sqlite3";
    process.env.DATABASE_NAME = ":memory:";
    process.env.DATABASE_SYNC = "true";
    // Raise memory thresholds to avoid false failures when 28 suites run in
    // parallel under NODE_OPTIONS=--max-old-space-size=1024.
    process.env.HEALTH_HEAP_THRESHOLD_MB = "900";
    process.env.HEALTH_RSS_THRESHOLD_MB = "1400";

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("/api/health (GET)", () => {
    return request(app.getHttpServer())
      .get("/api/health")
      .expect(200)
      .expect((res) => {
        expect((res.body as { status: string }).status).toBe("ok");
      });
  });
});
