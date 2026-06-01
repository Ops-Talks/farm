import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
  VersioningType,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
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

  // Create the user directly via the repository so no HTTP endpoint is required.
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
  const newUser = userRepo.create({
    username: user.username,
    email: user.email,
    password: user.password,
    displayName: user.displayName,
    roles: ["user"],
  });
  await userRepo.save(newUser);

  // Promote the user to admin role so guarded endpoints are accessible
  await userRepo.update({ username: user.username }, { roles: ["admin"] });

  const loginRes = await request(app.getHttpServer())
    .post("/api/v1/auth/login")
    .send({ username: user.username, password: user.password })
    .expect(200);

  const token = (loginRes.body as { token: string }).token;

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
