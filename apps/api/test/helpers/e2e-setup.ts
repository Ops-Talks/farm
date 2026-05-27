import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
  VersioningType,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require("cookie-parser");
import { AppModule } from "../../src/app.module";
import { User } from "../../src/modules/auth/entities/user.entity";
import { Organization } from "../../src/modules/organization/entities/organization.entity";
import { UserOrganization } from "../../src/modules/organization/entities/user-organization.entity";
import { OrgRole } from "@farm/types";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import request from "supertest";
import { App } from "supertest/types";

/**
 * Extracts the value of a named httpOnly cookie from a supertest response's
 * Set-Cookie header. The login and refresh endpoints deliver tokens this way.
 *
 * Usage:
 *   const token = extractCookieValue(loginRes.headers["set-cookie"], "access_token");
 */
export function extractCookieValue(
  setCookieHeader: string | string[] | undefined,
  name: string,
): string {
  const arr = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : [];
  const entry = arr.find((c) => c.startsWith(`${name}=`));
  return entry ? (entry.split(";")[0].split("=")[1] ?? "") : "";
}

/**
 * Creates and initializes a NestJS application for E2E testing
 * with a better-sqlite3 in-memory database, global pipes, and serialization.
 * Rate limiting uses high thresholds to avoid flaky test failures.
 */
export async function createE2EApp(): Promise<INestApplication<App>> {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_TYPE = "better-sqlite3";
  process.env.DATABASE_NAME = ":memory:";
  process.env.DATABASE_SYNC = "true";
  process.env.JWT_SECRET = "e2e-test-secret-that-is-at-least-32-characters";

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  // cookie-parser must be registered before NestJS route handlers so that
  // req.cookies is populated by the time controllers read auth cookies.
  app.use(cookieParser());
  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });
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
 * Registers a user with admin role, creates an organization for that user,
 * and returns the JWT token together with the organization id.
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
): Promise<{ token: string; organizationId: string }> {
  const user = {
    username: userData?.username || "e2e-admin",
    email: userData?.email || "admin@e2e-test.com",
    password: userData?.password || "TestPassword1",
    displayName: userData?.displayName || "E2E Admin",
  };

  await request(app.getHttpServer())
    .post("/api/v1/auth/register")
    .send(user)
    .expect(201);

  // Promote the user to admin role so guarded endpoints are accessible
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
  await userRepo.update({ username: user.username }, { roles: ["admin"] });

  const loginRes = await request(app.getHttpServer())
    .post("/api/v1/auth/login")
    .send({ username: user.username, password: user.password })
    .expect(200);

  // The login endpoint now delivers tokens via httpOnly Set-Cookie headers.
  // Extract the access_token value so e2e tests can pass it as an
  // Authorization: Bearer header — the JWT strategy accepts both sources.
  const setCookieHeader = loginRes.headers["set-cookie"] as
    | string[]
    | string
    | undefined;
  const cookieArr = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : [];
  const accessCookieEntry = cookieArr.find((c: string) =>
    c.startsWith("access_token="),
  );
  const token = accessCookieEntry
    ? (accessCookieEntry.split(";")[0].split("=")[1] ?? "")
    : "";

  // Retrieve the persisted user to get its generated id
  const userEntity = await userRepo.findOne({
    where: { username: user.username },
  });

  // Use a per-username slug so concurrent registrations in the same app
  // instance (e.g. istio / plugins tests) do not collide on the unique
  // slug / name columns.
  const orgSlug = userData?.username ? `${user.username}-org` : "e2e-test-org";
  const orgName = userData?.username ? `${user.username} Org` : "E2E Test Org";

  // Create the organization row
  const orgRepo = app.get<Repository<Organization>>(
    getRepositoryToken(Organization),
  );
  const org = orgRepo.create({
    name: orgName,
    slug: orgSlug,
    ownerId: userEntity!.id,
  });
  const savedOrg = await orgRepo.save(org);

  // Create the membership row linking the owner to the organization
  const userOrgRepo = app.get<Repository<UserOrganization>>(
    getRepositoryToken(UserOrganization),
  );
  const userOrg = userOrgRepo.create({
    userId: userEntity!.id,
    organizationId: savedOrg.id,
    role: OrgRole.OWNER,
  });
  await userOrgRepo.save(userOrg);

  return { token, organizationId: savedOrg.id };
}
