import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp } from "./helpers/e2e-setup";

describe("AppController (e2e)", () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    // With --runInBand, all 38 E2E suites share one process; by the time
    // this suite runs Node's heap can be several GB. Disable the memory
    // health indicators by setting thresholds high enough to never trigger.
    process.env.HEALTH_HEAP_THRESHOLD_MB = "100000";
    process.env.HEALTH_RSS_THRESHOLD_MB = "100000";
    app = await createE2EApp();
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
