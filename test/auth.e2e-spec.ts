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
      password: "securepass123",
      displayName: "Auth E2E User",
    };

    // Step 1: Register a new user
    const registerRes = await request(app.getHttpServer())
      .post("/api/auth/register")
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
      .post("/api/auth/login")
      .send({ username: userData.username, password: userData.password })
      .expect(200);

    const loginBody = loginRes.body as LoginResponse;
    expect(loginBody.token).toBeDefined();
    expect(typeof loginBody.token).toBe("string");
    expect(loginBody.user.username).toBe(userData.username);

    const token = loginBody.token;

    // Step 3: Use JWT token to access a protected endpoint (list users)
    const usersRes = await request(app.getHttpServer())
      .get("/api/auth/users")
      .expect(200);

    const users = usersRes.body as UserResponse[];
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThanOrEqual(1);
    expect(users.some((u) => u.username === userData.username)).toBe(true);

    // Step 4: Verify JWT works on a guarded endpoint
    const catalogRes = await request(app.getHttpServer())
      .get("/api/catalog/components")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(catalogRes.body)).toBe(true);
  });

  it("should reject registration with missing fields", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ username: "incomplete" })
      .expect(400);
  });

  it("should reject login with invalid credentials", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ username: "nonexistent", password: "wrongpass" })
      .expect(401);
  });

  it("should reject duplicate registration", async () => {
    const userData = {
      username: "dup_user",
      email: "dup@test.com",
      password: "password1234",
      displayName: "Dup User",
    };

    await request(app.getHttpServer())
      .post("/api/auth/register")
      .send(userData)
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/auth/register")
      .send(userData)
      .expect(409);
  });

  it("should reject access to protected endpoints without token", async () => {
    await request(app.getHttpServer())
      .get("/api/catalog/components")
      .expect(401);
  });
});
