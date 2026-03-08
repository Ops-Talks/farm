import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { createE2EApp, registerAndLogin } from "./helpers/e2e-setup";

interface TeamResponse {
  id: string;
  name: string;
  displayName: string;
  type: string;
  description?: string;
  contactEmail?: string;
  slackChannel?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface UserResponse {
  id: string;
  username: string;
  email: string;
  displayName: string;
  roles: string[] | null;
}

interface ComponentResponse {
  id: string;
  name: string;
  kind: string;
  owner: string;
}

/**
 * Extracts items from a response body that may be either a plain array
 * or a paginated object with a `data` property.
 */
function extractItems<T>(body: T[] | { data: T[] }): T[] {
  if (Array.isArray(body)) {
    return body;
  }
  return body.data;
}

describe("Teams (e2e)", () => {
  let app: INestApplication<App>;
  let token: string;

  beforeAll(async () => {
    app = await createE2EApp();
    token = await registerAndLogin(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it("should complete the full CRUD lifecycle: create -> list -> get -> update -> delete -> 404", async () => {
    // Step 1: Create a team with all fields
    const createDto = {
      name: "e2e-platform-team",
      displayName: "E2E Platform Team",
      type: "platform",
      description: "Platform team for E2E testing",
      contactEmail: "platform@e2e-test.com",
      slackChannel: "#e2e-platform",
      metadata: { region: "us-east-1", tier: "core" },
    };

    const createRes = await request(app.getHttpServer())
      .post("/api/teams")
      .set("Authorization", `Bearer ${token}`)
      .send(createDto)
      .expect(201);

    const created = createRes.body as TeamResponse;
    expect(created.id).toBeDefined();
    expect(created.name).toBe(createDto.name);
    expect(created.displayName).toBe(createDto.displayName);
    expect(created.type).toBe(createDto.type);
    expect(created.description).toBe(createDto.description);
    expect(created.contactEmail).toBe(createDto.contactEmail);
    expect(created.slackChannel).toBe(createDto.slackChannel);
    expect(created.metadata).toEqual(createDto.metadata);

    const teamId = created.id;

    // Step 2: List all teams and verify the created one is present
    const listRes = await request(app.getHttpServer())
      .get("/api/teams")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const teams = extractItems<TeamResponse>(
      listRes.body as TeamResponse[] | { data: TeamResponse[] },
    );
    expect(teams.some((t) => t.id === teamId)).toBe(true);

    // Step 3: Get team by ID and verify all fields
    const getRes = await request(app.getHttpServer())
      .get(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const fetched = getRes.body as TeamResponse;
    expect(fetched.id).toBe(teamId);
    expect(fetched.name).toBe(createDto.name);
    expect(fetched.displayName).toBe(createDto.displayName);
    expect(fetched.type).toBe(createDto.type);
    expect(fetched.description).toBe(createDto.description);
    expect(fetched.contactEmail).toBe(createDto.contactEmail);
    expect(fetched.slackChannel).toBe(createDto.slackChannel);

    // Step 4: Update description and displayName
    const updateDto = {
      description: "Updated platform team description",
      displayName: "E2E Platform Team (Updated)",
    };

    const updateRes = await request(app.getHttpServer())
      .patch(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(updateDto)
      .expect(200);

    const updated = updateRes.body as TeamResponse;
    expect(updated.description).toBe(updateDto.description);
    expect(updated.displayName).toBe(updateDto.displayName);
    // Unchanged fields should persist
    expect(updated.name).toBe(createDto.name);
    expect(updated.type).toBe(createDto.type);

    // Step 5: Delete the team
    await request(app.getHttpServer())
      .delete(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    // Step 6: Confirm deletion returns 404
    await request(app.getHttpServer())
      .get(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("should manage team members: add -> list -> remove -> verify removal", async () => {
    // Create a team for member management
    const teamRes = await request(app.getHttpServer())
      .post("/api/teams")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "e2e-member-team",
        displayName: "E2E Member Team",
        type: "dev",
      })
      .expect(201);

    const teamId = (teamRes.body as TeamResponse).id;

    // Get the admin user's ID from the auth users endpoint
    const usersRes = await request(app.getHttpServer())
      .get("/api/auth/users")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const users = extractItems<UserResponse>(
      usersRes.body as UserResponse[] | { data: UserResponse[] },
    );
    const adminUser = users.find((u) => u.username === "e2e-admin");
    expect(adminUser).toBeDefined();
    const userId = adminUser!.id;

    // Add the user as a team member
    const addRes = await request(app.getHttpServer())
      .post(`/api/teams/${teamId}/members/${userId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const teamAfterAdd = addRes.body as TeamResponse;
    expect(teamAfterAdd.id).toBe(teamId);

    // List members and verify the user is present
    const membersRes = await request(app.getHttpServer())
      .get(`/api/teams/${teamId}/members`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const members = extractItems<UserResponse>(
      membersRes.body as UserResponse[] | { data: UserResponse[] },
    );
    expect(members.some((m) => m.id === userId)).toBe(true);

    // Remove the member
    await request(app.getHttpServer())
      .delete(`/api/teams/${teamId}/members/${userId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    // List members and verify the user is gone
    const membersAfterRemove = await request(app.getHttpServer())
      .get(`/api/teams/${teamId}/members`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const remainingMembers = extractItems<UserResponse>(
      membersAfterRemove.body as UserResponse[] | { data: UserResponse[] },
    );
    expect(remainingMembers.some((m) => m.id === userId)).toBe(false);
  });

  it("should list components owned by a team", async () => {
    // Create a team
    const teamRes = await request(app.getHttpServer())
      .post("/api/teams")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "e2e-component-owner",
        displayName: "E2E Component Owner Team",
        type: "infra",
      })
      .expect(201);

    const team = teamRes.body as TeamResponse;

    // Create a component with owner set to the team name
    const componentDto = {
      name: "e2e-owned-service",
      kind: "service",
      owner: team.name,
    };

    await request(app.getHttpServer())
      .post("/api/catalog/components")
      .set("Authorization", `Bearer ${token}`)
      .send(componentDto)
      .expect(201);

    // List team components and verify the component is present
    const componentsRes = await request(app.getHttpServer())
      .get(`/api/teams/${team.id}/components`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const components = extractItems<ComponentResponse>(
      componentsRes.body as ComponentResponse[] | { data: ComponentResponse[] },
    );
    expect(components.some((c) => c.name === componentDto.name)).toBe(true);
    expect(components.some((c) => c.owner === team.name)).toBe(true);
  });

  it("should reject creation with missing required fields", async () => {
    // Missing all required fields
    await request(app.getHttpServer())
      .post("/api/teams")
      .set("Authorization", `Bearer ${token}`)
      .send({})
      .expect(400);

    // Missing displayName and type
    await request(app.getHttpServer())
      .post("/api/teams")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "incomplete-team" })
      .expect(400);
  });

  it("should reject creation with invalid team type", async () => {
    await request(app.getHttpServer())
      .post("/api/teams")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "bad-type-team",
        displayName: "Bad Type Team",
        type: "nonexistent_type",
      })
      .expect(400);
  });

  it("should reject creation with a duplicate team name", async () => {
    const teamDto = {
      name: "e2e-duplicate-team",
      displayName: "E2E Duplicate Team",
      type: "other",
    };

    await request(app.getHttpServer())
      .post("/api/teams")
      .set("Authorization", `Bearer ${token}`)
      .send(teamDto)
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/teams")
      .set("Authorization", `Bearer ${token}`)
      .send(teamDto)
      .expect(409);
  });
});
