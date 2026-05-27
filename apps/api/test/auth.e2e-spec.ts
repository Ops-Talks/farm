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

/**
 * Shape returned by the cookie-based login endpoint.
 * Tokens are delivered via Set-Cookie headers, not in the body.
 */
interface LoginResponse {
  message: string;
  user: UserResponse;
}

/**
 * Extracts the raw cookie value for the given cookie name from a supertest
 * response's Set-Cookie header array.
 */
function extractCookieValue(
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
    // Tokens are no longer in the body — they arrive via Set-Cookie.
    expect(loginBody.message).toBe("Login successful");
    expect(loginBody.user.username).toBe(userData.username);
    expect(loginBody).not.toHaveProperty("token");
    expect(loginBody).not.toHaveProperty("refreshToken");

    // Verify that Set-Cookie headers carry the httpOnly auth cookies.
    const setCookieHeader = loginRes.headers["set-cookie"] as string[];
    expect(setCookieHeader).toBeDefined();
    const accessCookie = extractCookieValue(setCookieHeader, "access_token");
    expect(accessCookie).toBeTruthy();
    const refreshCookie = extractCookieValue(setCookieHeader, "refresh_token");
    expect(refreshCookie).toBeTruthy();

    const token = accessCookie;

    // Promote user to admin so GET /auth/users is accessible
    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    await userRepo.update(
      { username: userData.username },
      { roles: ["admin"] },
    );

    // Re-login to get a token with the updated admin role
    const adminLoginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: userData.username, password: userData.password })
      .expect(200);
    const adminToken = extractCookieValue(
      adminLoginRes.headers["set-cookie"],
      "access_token",
    );

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

    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send(userData)
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: userData.username, password: userData.password })
      .expect(200);

    // Extract tokens from Set-Cookie headers.
    const loginCookies = loginRes.headers["set-cookie"] as string[];
    const refreshToken = extractCookieValue(loginCookies, "refresh_token");
    const accessToken = extractCookieValue(loginCookies, "access_token");
    expect(refreshToken).toBeTruthy();
    expect(accessToken).toBeTruthy();

    // Use refresh token cookie + username body to get a new access token.
    const refreshRes = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set(
        "Cookie",
        `refresh_token=${refreshToken}; access_token=${accessToken}`,
      )
      .expect(200);

    const refreshBody = refreshRes.body as { message: string };
    expect(refreshBody.message).toBe("Token refreshed");
    // Tokens are NOT in the body — they arrive via Set-Cookie.
    expect(refreshBody).not.toHaveProperty("token");
    expect(refreshBody).not.toHaveProperty("refreshToken");

    // Verify new cookies are issued.
    const refreshCookies = refreshRes.headers["set-cookie"] as string[];
    const newRefreshToken = extractCookieValue(refreshCookies, "refresh_token");
    const newAccessToken = extractCookieValue(refreshCookies, "access_token");
    expect(newRefreshToken).toBeTruthy();
    expect(newAccessToken).toBeTruthy();
    // Rotated token should differ from the original.
    expect(newRefreshToken).not.toBe(refreshToken);

    // New refresh token should work BEFORE testing the old one, because
    // presenting the already-consumed T1 triggers family-wide invalidation
    // (reuse detection) which would also revoke T2.
    const secondRefresh = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set(
        "Cookie",
        `refresh_token=${newRefreshToken}; access_token=${newAccessToken}`,
      )
      .expect(200);

    expect((secondRefresh.body as { message: string }).message).toBe(
      "Token refreshed",
    );

    // Old refresh token should no longer work (its family is now revoked by
    // the reuse-detection guard after this call, which is fine — T2 was
    // already verified above).
    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set(
        "Cookie",
        `refresh_token=${refreshToken}; access_token=${accessToken}`,
      )
      .expect(401);
  });

  it("should reject an old JWT after a password change (tokenVersion invalidation)", async () => {
    const userData = {
      username: "token_version_user",
      email: "token_version@test.com",
      password: "TokenPass1",
      displayName: "Token Version User",
    };

    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send(userData)
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: userData.username, password: userData.password })
      .expect(200);

    const accessToken = extractCookieValue(
      loginRes.headers["set-cookie"],
      "access_token",
    );
    expect(accessToken).toBeTruthy();

    // Verify the token works before the password change.
    await request(app.getHttpServer())
      .get("/api/v1/auth/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    // Change the password — this increments tokenVersion in the DB.
    await request(app.getHttpServer())
      .patch("/api/v1/auth/profile/password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currentPassword: userData.password,
        newPassword: "NewTokenPass1",
        confirmPassword: "NewTokenPass1",
      })
      .expect(204);

    // The old access token must now be rejected (stale tokenVersion).
    await request(app.getHttpServer())
      .get("/api/v1/auth/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(401);
  });

  it("should revoke the entire token family when a reused refresh token is detected", async () => {
    const userData = {
      username: "reuse_detect_user",
      email: "reuse_detect@test.com",
      password: "ReusePass1",
      displayName: "Reuse Detect User",
    };

    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send(userData)
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: userData.username, password: userData.password })
      .expect(200);

    const loginCookies = loginRes.headers["set-cookie"] as string[];
    const t1 = extractCookieValue(loginCookies, "refresh_token");
    const accessT1 = extractCookieValue(loginCookies, "access_token");

    // Legitimately rotate T1 → T2.
    const rotateRes = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", `refresh_token=${t1}; access_token=${accessT1}`)
      .expect(200);

    const rotateCookies = rotateRes.headers["set-cookie"] as string[];
    const t2 = extractCookieValue(rotateCookies, "refresh_token");
    const accessT2 = extractCookieValue(rotateCookies, "access_token");
    expect(t2).not.toBe(t1);

    // An attacker replays T1 (already consumed). This triggers reuse detection,
    // revoking the entire token family — including T2.
    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", `refresh_token=${t1}; access_token=${accessT1}`)
      .expect(401);

    // T2 (from the legitimate rotation) must also be rejected now that the
    // family has been revoked by the reuse detection above.
    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", `refresh_token=${t2}; access_token=${accessT2}`)
      .expect(401);
  });

  it("should allow two parallel logins (multi-device) to coexist independently", async () => {
    // Register a shared user for this test.
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        username: "multi_device_user",
        email: "multi_device@test.com",
        password: "MultiDevice1",
        displayName: "Multi Device User",
      })
      .expect(201);

    // Login from device 1.
    const login1 = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: "multi_device_user", password: "MultiDevice1" })
      .expect(200);
    const cookies1 = login1.headers["set-cookie"] as string[];
    const rt1 = extractCookieValue(cookies1, "refresh_token");
    const at1 = extractCookieValue(cookies1, "access_token");

    // Login from device 2 (same credentials, independent session).
    const login2 = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: "multi_device_user", password: "MultiDevice1" })
      .expect(200);
    const cookies2 = login2.headers["set-cookie"] as string[];
    const rt2 = extractCookieValue(cookies2, "refresh_token");
    const at2 = extractCookieValue(cookies2, "access_token");

    // Both sessions must have distinct refresh tokens.
    expect(rt1).not.toBe(rt2);

    // Device 1 can still refresh its token independently.
    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", `refresh_token=${rt1}; access_token=${at1}`)
      .expect(200);

    // Device 2 can also refresh its token independently (not affected by device 1's refresh).
    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Cookie", `refresh_token=${rt2}; access_token=${at2}`)
      .expect(200);
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

    const userToken = extractCookieValue(
      loginRes.headers["set-cookie"],
      "access_token",
    );

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

    // Register the test user
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send(profileUser)
      .expect(201);

    // Login to obtain a token
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: profileUser.username, password: profileUser.password })
      .expect(200);

    token = extractCookieValue(loginRes.headers["set-cookie"], "access_token");
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

      await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send(secondUser)
        .expect(201);

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

      const freshToken = extractCookieValue(
        loginRes.headers["set-cookie"],
        "access_token",
      );

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

      const freshToken = extractCookieValue(
        loginRes.headers["set-cookie"],
        "access_token",
      );

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
