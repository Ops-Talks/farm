import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp } from "./helpers/e2e-setup";

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

  it("should complete the full auth lifecycle: register -> login -> JWT -> list users", async () => {
    const userData = {
      username: "auth_e2e_user",
      email: "auth_e2e@test.com",
      password: "SecurePass1",
      displayName: "Auth E2E User",
    };

    // Step 1: Register a new user
    const registerRes = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send(userData)
      .expect(201);

    const registered = registerRes.body as UserResponse;
    expect(registered.username).toBe(userData.username);
    expect(registered.email).toBe(userData.email);
    expect(registered.displayName).toBe(userData.displayName);
    expect(registered).not.toHaveProperty("password");
    expect(registered.id).toBeDefined();

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

    // Step 3: Use JWT token to access a protected endpoint (list users)
    const usersRes = await request(app.getHttpServer())
      .get("/api/v1/auth/users")
      .expect(200);

    const users = usersRes.body as UserResponse[];
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThanOrEqual(1);
    expect(users.some((u) => u.username === userData.username)).toBe(true);

    // Step 4: Verify JWT works on a guarded endpoint
    const catalogRes = await request(app.getHttpServer())
      .get("/api/v1/catalog/components")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const catalogBody = catalogRes.body as {
      data: unknown[];
      total: number;
      skip: number;
      take: number;
    };
    expect(Array.isArray(catalogBody.data)).toBe(true);
    expect(catalogBody.skip).toBe(0);
    expect(catalogBody.take).toBe(20);
  });

  it("should refresh an access token using a valid refresh token", async () => {
    const userData = {
      username: "refresh_user",
      email: "refresh@test.com",
      password: "RefreshPass1",
      displayName: "Refresh User",
    };

    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send(userData)
      .expect(201);

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

  it("should reject registration with weak password", async () => {
    const weakPasswords = [
      { password: "short1A", reason: "too short" },
      { password: "alllowercase1", reason: "no uppercase" },
      { password: "ALLUPPERCASE1", reason: "no lowercase" },
      { password: "NoDigitsHere", reason: "no number" },
    ];

    for (const { password } of weakPasswords) {
      await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send({
          username: "weakuser",
          email: "weak@test.com",
          password,
          displayName: "Weak User",
        })
        .expect(400);
    }
  });

  it("should reject registration with too short username", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        username: "a",
        email: "short@test.com",
        password: "ValidPass1",
        displayName: "Short User",
      })
      .expect(400);
  });

  it("should reject registration with missing fields", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ username: "incomplete" })
      .expect(400);
  });

  it("should reject login with invalid credentials", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: "nonexistent", password: "WrongPass1" })
      .expect(401);
  });

  it("should reject duplicate registration", async () => {
    const userData = {
      username: "dup_user",
      email: "dup@test.com",
      password: "DupPassword1",
      displayName: "Dup User",
    };

    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send(userData)
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send(userData)
      .expect(409);
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
    // Register a regular user (not promoted to admin)
    const userData = {
      username: "regular_user",
      email: "regular@test.com",
      password: "RegularPass1",
      displayName: "Regular User",
    };

    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send(userData)
      .expect(201);

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
