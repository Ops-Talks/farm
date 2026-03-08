import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "../../src/app.module";
import { User } from "../../src/auth/entities/user.entity";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import request from "supertest";
import { App } from "supertest/types";

/**
 * Creates and initializes a NestJS application for E2E testing
 * with SQLite in-memory database, global pipes, and serialization.
 */
export async function createE2EApp(): Promise<INestApplication<App>> {
  process.env.DATABASE_TYPE = "sqlite";
  process.env.DATABASE_NAME = ":memory:";
  process.env.DATABASE_SYNC = "true";
  process.env.JWT_SECRET = "e2e-test-secret";

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  await app.init();
  return app;
}

/**
 * Registers a user with admin role and returns the JWT token.
 * Updates the user role to admin after registration so guarded
 * endpoints can be accessed in E2E tests.
 */
export async function registerAndLogin(
  app: INestApplication<App>,
  userData?: {
    username?: string;
    email?: string;
    password?: string;
    displayName?: string;
  },
): Promise<string> {
  const user = {
    username: userData?.username || "e2e-admin",
    email: userData?.email || "admin@e2e-test.com",
    password: userData?.password || "testpassword123",
    displayName: userData?.displayName || "E2E Admin",
  };

  await request(app.getHttpServer())
    .post("/api/auth/register")
    .send(user)
    .expect(201);

  // Promote the user to admin role so guarded endpoints are accessible
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
  await userRepo.update({ username: user.username }, { roles: ["admin"] });

  const loginRes = await request(app.getHttpServer())
    .post("/api/auth/login")
    .send({ username: user.username, password: user.password })
    .expect(200);

  return (loginRes.body as { token: string }).token;
}
