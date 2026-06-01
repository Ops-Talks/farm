import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { Repository } from "typeorm";
import { getRepositoryToken } from "@nestjs/typeorm";
import { createE2EApp } from "./helpers/e2e-setup";
import { User } from "../src/modules/auth/entities/user.entity";

interface UserResponse {
  id: string;
  username: string;
  email: string;
  displayName: string;
  roles: string[];
}

interface LoginResponse {
  user: UserResponse;
  token: string;
  refreshToken: string;
}

describe("Auth Lifecycle (e2e)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createE2EApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("should complete the full auth lifecycle: login -> JWT -> list users", async () => {
    const userData = {
      username: "auth_e2e_user",
      email: "auth_e2e@test.com",
      password: "SecurePass1",
      displayName: "Auth E2E User",
    };

    // Step 1: Create user directly via repository (no public register endpoint)
    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    const newUser = userRepo.create({
      ...userData,
      roles: ["user"],
    });
    const created = await userRepo.save(newUser);
    expect(created.username).toBe(userData.username);
    expect(created.email).toBe(userData.email);
    expect(created.id).toBeDefined();

    // Step 2: Login with the registered user
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: userData.username, password: userData.password })
      .expect(200);

    const loginBody = loginRes.body as LoginResponse;
    expect(loginBody.token).toBeDefined();
    expect(typeof loginBody.token).toBe("string");
    expect(loginBody.refreshToken).toBeDefined();
    expect(typeof loginBody.refreshToken).toBe("string");
    expect(loginBody.user.username).toBe(userData.username);

    const token = loginBody.token;

    // Promote user to admin so GET /auth/users is accessible
    await userRepo.update(
      { username: userData.username },
      { roles: ["admin"] },
    );

    // Re-login to get a token with the updated admin role
    const adminLoginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: userData.username, password: userData.password })
      .expect(200);
    const adminToken = (adminLoginRes.body as LoginResponse).token;

    // Step 3: Use admin JWT token to access the users list (admin only)
    const usersRes = await request(app.getHttpServer())
      .get("/api/v1/auth/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const users = usersRes.body as UserResponse[];
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThanOrEqual(1);
    expect(users.some((u) => u.username === userData.username)).toBe(true);

    // Step 4: Verify JWT works on a guarded endpoint
    const meRes = await request(app.getHttpServer())
      .get("/api/v1/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const meBody = meRes.body as UserResponse;
    expect(meBody.username).toBe(userData.username);
  });

  it("should refresh an access token using a valid refresh token", async () => {
    const userData = {
      username: "refresh_user",
      email: "refresh@test.com",
      password: "RefreshPass1",
      displayName: "Refresh User",
    };

    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    const newUser = userRepo.create({ ...userData, roles: ["user"] });
    await userRepo.save(newUser);

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: userData.username, password: userData.password })
      .expect(200);

    const loginBody = loginRes.body as LoginResponse;
    const refreshToken = loginBody.refreshToken;

    // Use refresh token to get a new access token
    const refreshRes = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ username: userData.username, refreshToken })
      .expect(200);

    const refreshBody = refreshRes.body as {
      token: string;
      refreshToken: string;
    };
    expect(refreshBody.token).toBeDefined();
    expect(refreshBody.refreshToken).toBeDefined();
    // Rotated token should differ from the original
    expect(refreshBody.refreshToken).not.toBe(refreshToken);

    // Old refresh token should no longer work
    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ username: userData.username, refreshToken })
      .expect(401);

    // New refresh token should work
    const secondRefresh = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({
        username: userData.username,
        refreshToken: refreshBody.refreshToken,
      })
      .expect(200);

    expect((secondRefresh.body as { token: string }).token).toBeDefined();
  });

  it("should reject login with invalid credentials", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: "nonexistent", password: "WrongPass1" })
      .expect(401);
  });

  it("should reject access to protected endpoints without token", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/catalog/components")
      .expect(401);
  });

  it("should reject access with malformed JWT token", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/catalog/components")
      .set("Authorization", "Bearer invalid.jwt.token")
      .expect(401);
  });

  it("should reject non-admin users from admin-only endpoints", async () => {
    const userData = {
      username: "regular_user",
      email: "regular@test.com",
      password: "RegularPass1",
      displayName: "Regular User",
    };

    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    const newUser = userRepo.create({ ...userData, roles: ["user"] });
    await userRepo.save(newUser);

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: userData.username, password: userData.password })
      .expect(200);

    const userToken = (loginRes.body as { token: string }).token;

    // Try to access admin-only endpoint
    await request(app.getHttpServer())
      .post("/api/v1/catalog/components")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "test", kind: "service", owner: "team" })
      .expect(403);
  });
});

describe("User Profile Management (e2e)", () => {
  let app: INestApplication<App>;

  const profileUser = {
    username: "profile_e2e_user",
    email: "profile_e2e@test.com",
    password: "ProfilePass1",
    displayName: "Profile E2E User",
  };

  let token: string;

  beforeAll(async () => {
    app = await createE2EApp();

    // Create the test user directly via repository
    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    await userRepo.save(userRepo.create({ ...profileUser, roles: ["user"] }));

    // Login to obtain a token
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: profileUser.username, password: profileUser.password })
      .expect(200);

    token = (loginRes.body as { token: string }).token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /api/v1/auth/profile", () => {
    it("should return the authenticated user profile (200)", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/auth/profile")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const body = res.body as UserResponse;
      expect(body.username).toBe(profileUser.username);
      expect(body.email).toBe(profileUser.email);
      expect(body.displayName).toBe(profileUser.displayName);
      expect(body).not.toHaveProperty("password");
    });

    it("should return 401 when unauthenticated", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/auth/profile")
        .expect(401);
    });
  });

  describe("PATCH /api/v1/auth/profile", () => {
    it("should update profile fields and return the updated user (200)", async () => {
      const res = await request(app.getHttpServer())
        .patch("/api/v1/auth/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({ firstName: "Jane", lastName: "Smith", gender: "female" })
        .expect(200);

      const body = res.body as UserResponse & {
        firstName: string;
        lastName: string;
        gender: string;
      };
      expect(body.firstName).toBe("Jane");
      expect(body.lastName).toBe("Smith");
      expect(body.gender).toBe("female");
      expect(body.username).toBe(profileUser.username);
    });

    it("should return 409 when updating to an email already taken by another user", async () => {
      // Register a second user whose email we will try to steal
      const secondUser = {
        username: "profile_e2e_user2",
        email: "profile_e2e2@test.com",
        password: "ProfilePass2",
        displayName: "Profile E2E User 2",
      };

      const userRepo2 = app.get<Repository<User>>(getRepositoryToken(User));
      await userRepo2.save(
        userRepo2.create({ ...secondUser, roles: ["user"] }),
      );

      await request(app.getHttpServer())
        .patch("/api/v1/auth/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({ email: secondUser.email })
        .expect(409);
    });
  });

  describe("PATCH /api/v1/auth/profile/password", () => {
    it("should change the password and return 204", async () => {
      await request(app.getHttpServer())
        .patch("/api/v1/auth/profile/password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: profileUser.password,
          newPassword: "NewProfilePass1",
          confirmPassword: "NewProfilePass1",
        })
        .expect(204);

      // Verify old password no longer works for login
      await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          username: profileUser.username,
          password: profileUser.password,
        })
        .expect(401);

      // Verify new password works
      await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          username: profileUser.username,
          password: "NewProfilePass1",
        })
        .expect(200);
    });

    it("should return 401 when the current password is wrong", async () => {
      // Re-login with the updated password to obtain a fresh token
      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ username: profileUser.username, password: "NewProfilePass1" })
        .expect(200);

      const freshToken = (loginRes.body as { token: string }).token;

      await request(app.getHttpServer())
        .patch("/api/v1/auth/profile/password")
        .set("Authorization", `Bearer ${freshToken}`)
        .send({
          currentPassword: "WrongCurrentPass1",
          newPassword: "AnotherPass1",
          confirmPassword: "AnotherPass1",
        })
        .expect(401);
    });

    it("should return 400 when newPassword and confirmPassword do not match", async () => {
      // Re-login with the updated password to obtain a fresh token
      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ username: profileUser.username, password: "NewProfilePass1" })
        .expect(200);

      const freshToken = (loginRes.body as { token: string }).token;

      await request(app.getHttpServer())
        .patch("/api/v1/auth/profile/password")
        .set("Authorization", `Bearer ${freshToken}`)
        .send({
          currentPassword: "NewProfilePass1",
          newPassword: "AnotherPass1",
          confirmPassword: "MismatchedPass1",
        })
        .expect(400);
    });
  });
});
