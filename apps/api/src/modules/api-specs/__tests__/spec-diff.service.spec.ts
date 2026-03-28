import { SpecDiffService } from "../spec-diff.service";

const OPENAPI_USERS = `
openapi: "3.0.0"
info:
  title: Test API
  version: "1.0.0"
paths:
  /users:
    get:
      summary: List users
      parameters:
        - name: page
          in: query
      responses:
        "200":
          description: OK
`;

const OPENAPI_USERS_WITH_ID = `
openapi: "3.0.0"
info:
  title: Test API
  version: "1.0.0"
paths:
  /users:
    get:
      summary: List users
      parameters:
        - name: page
          in: query
      responses:
        "200":
          description: OK
  /users/{id}:
    get:
      summary: Get user
      responses:
        "200":
          description: OK
`;

const OPENAPI_MISSING_USERS = `
openapi: "3.0.0"
info:
  title: Test API
  version: "1.0.0"
paths: {}
`;

const OPENAPI_MISSING_GET = `
openapi: "3.0.0"
info:
  title: Test API
  version: "1.0.0"
paths:
  /users:
    post:
      summary: Create user
      responses:
        "201":
          description: Created
`;

const OPENAPI_ADDED_GET = `
openapi: "3.0.0"
info:
  title: Test API
  version: "1.0.0"
paths:
  /users:
    get:
      summary: List users
      responses:
        "200":
          description: OK
    post:
      summary: Create user
      responses:
        "201":
          description: Created
`;

const ASYNCAPI_V1 = `
asyncapi: "2.0.0"
info:
  title: Events
  version: "1.0.0"
channels:
  user/created:
    subscribe:
      message:
        payload:
          type: object
`;

const ASYNCAPI_V2 = `
asyncapi: "2.0.0"
info:
  title: Events
  version: "1.0.0"
channels:
  user/created:
    subscribe:
      message:
        payload:
          type: object
  user/deleted:
    subscribe:
      message:
        payload:
          type: object
`;

const ASYNCAPI_REMOVED = `
asyncapi: "2.0.0"
info:
  title: Events
  version: "1.0.0"
channels: {}
`;

describe("SpecDiffService", () => {
  let service: SpecDiffService;

  beforeEach(() => {
    service = new SpecDiffService();
  });

  // --------------------------------------------------------------------------
  // OpenAPI diff
  // --------------------------------------------------------------------------

  describe("OpenAPI diff", () => {
    it("should return 0 changes for identical specs", () => {
      const result = service.diff(OPENAPI_USERS, OPENAPI_USERS);
      expect(result.totalChanges).toBe(0);
      expect(result.breakingChanges).toBe(0);
      expect(result.entries).toHaveLength(0);
    });

    it("should detect an added path as non-breaking", () => {
      const result = service.diff(OPENAPI_USERS, OPENAPI_USERS_WITH_ID);
      const added = result.entries.filter((e) => e.type === "added");
      expect(added).toHaveLength(1);
      expect(added[0].path).toBe("/users/{id}");
      expect(added[0].breaking).toBe(false);
      expect(result.breakingChanges).toBe(0);
    });

    it("should detect a removed path as breaking", () => {
      const result = service.diff(OPENAPI_USERS, OPENAPI_MISSING_USERS);
      const removed = result.entries.filter((e) => e.type === "removed");
      expect(removed).toHaveLength(1);
      expect(removed[0].path).toBe("/users");
      expect(removed[0].breaking).toBe(true);
      expect(result.breakingChanges).toBe(1);
    });

    it("should detect a removed operation as breaking", () => {
      // OPENAPI_USERS has GET /users; OPENAPI_MISSING_GET has POST /users only
      const result = service.diff(OPENAPI_USERS, OPENAPI_MISSING_GET);
      const removedOps = result.entries.filter(
        (e) => e.type === "removed" && e.path === "GET /users",
      );
      expect(removedOps).toHaveLength(1);
      expect(removedOps[0].breaking).toBe(true);
    });

    it("should detect an added operation as non-breaking", () => {
      // OPENAPI_USERS has GET /users; OPENAPI_ADDED_GET has GET + POST /users
      const result = service.diff(OPENAPI_USERS, OPENAPI_ADDED_GET);
      const addedOps = result.entries.filter(
        (e) => e.type === "added" && e.path === "POST /users",
      );
      expect(addedOps).toHaveLength(1);
      expect(addedOps[0].breaking).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // AsyncAPI diff
  // --------------------------------------------------------------------------

  describe("AsyncAPI diff", () => {
    it("should return 0 changes for identical asyncapi specs", () => {
      const result = service.diff(ASYNCAPI_V1, ASYNCAPI_V1);
      expect(result.totalChanges).toBe(0);
      expect(result.breakingChanges).toBe(0);
    });

    it("should detect an added channel as non-breaking", () => {
      const result = service.diff(ASYNCAPI_V1, ASYNCAPI_V2);
      const added = result.entries.filter((e) => e.type === "added");
      expect(added).toHaveLength(1);
      expect(added[0].path).toBe("user/deleted");
      expect(added[0].breaking).toBe(false);
    });

    it("should detect a removed channel as breaking", () => {
      const result = service.diff(ASYNCAPI_V1, ASYNCAPI_REMOVED);
      const removed = result.entries.filter((e) => e.type === "removed");
      expect(removed).toHaveLength(1);
      expect(removed[0].path).toBe("user/created");
      expect(removed[0].breaking).toBe(true);
      expect(result.breakingChanges).toBe(1);
    });
  });
});
