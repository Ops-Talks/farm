/**
 * Tests for bootstrap-admin.ts.
 *
 * Covers: env-var guard (exits when any var is missing or empty), idempotent
 * skip (user already exists by username or email), success path (create+save),
 * race-condition duplicate-key handling, org creation paths (new/existing org,
 * ownerId patch, membership skip), and the run() orchestrator (initialize →
 * runBootstrapAdmin → destroy in finally).
 *
 * Strategy for process.exit: mocked to throw a sentinel error so the function
 * does not continue executing past the guard. Tests assert rejection with the
 * sentinel instead of a plain spy-call assertion.
 *
 * Strategy for runBootstrapAdmin(ds): a hand-rolled ds mock is passed as an
 * argument — no module mock needed. getRepository dispatches by entity class.
 *
 * Strategy for run(): jest.mock("./seed.data-source") because run() uses the
 * default import directly.
 */

import { QueryFailedError, DataSource, Repository } from "typeorm";
import { runBootstrapAdmin, run } from "./bootstrap-admin";
import { User } from "../../modules/auth/entities/user.entity";
import { Organization } from "../../modules/organization/entities/organization.entity";
import { UserOrganization } from "../../modules/organization/entities/user-organization.entity";
import { OrgRole } from "@farm/types";
import dataSource from "./seed.data-source";

// ─── Sentinel used to detect process.exit(1) calls ────────────────────────
const EXIT_ERROR = new Error("process.exit:1");

// ─── Mock seed.data-source for run() tests ────────────────────────────────
jest.mock("./seed.data-source", () => ({
  __esModule: true,
  default: {
    isInitialized: false,
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    getRepository: jest.fn(),
  },
}));

const mockedDs = dataSource as unknown as {
  isInitialized: boolean;
  initialize: jest.Mock;
  destroy: jest.Mock;
  getRepository: jest.Mock;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function buildMockUserRepo(existing: Partial<User> | null = null) {
  return {
    findOne: jest.fn().mockResolvedValue(existing),
    create: jest.fn().mockImplementation((data: Partial<User>) => ({
      id: "user-uuid",
      ...data,
    })),
    save: jest
      .fn()
      .mockImplementation((entity: User) => Promise.resolve(entity)),
  } as unknown as jest.Mocked<Repository<User>>;
}

function buildMockOrgRepo(existing: Partial<Organization> | null = null) {
  return {
    findOne: jest.fn().mockResolvedValue(existing),
    create: jest.fn().mockImplementation((data: Partial<Organization>) => ({
      id: "org-uuid",
      ...data,
    })),
    save: jest
      .fn()
      .mockImplementation((entity: Organization) => Promise.resolve(entity)),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as jest.Mocked<Repository<Organization>>;
}

function buildMockMemberRepo(
  existing: Partial<UserOrganization> | null = null,
) {
  return {
    findOne: jest.fn().mockResolvedValue(existing),
    create: jest.fn().mockImplementation((data: Partial<UserOrganization>) => ({
      id: "member-uuid",
      ...data,
    })),
    save: jest
      .fn()
      .mockImplementation((entity: UserOrganization) =>
        Promise.resolve(entity),
      ),
  } as unknown as jest.Mocked<Repository<UserOrganization>>;
}

function buildDs(
  userRepo: jest.Mocked<Repository<User>>,
  orgRepo: jest.Mocked<Repository<Organization>> = buildMockOrgRepo(),
  memberRepo: jest.Mocked<Repository<UserOrganization>> = buildMockMemberRepo(),
) {
  return {
    getRepository: jest.fn().mockImplementation((entity: unknown) => {
      if (entity === User) return userRepo;
      if (entity === Organization) return orgRepo;
      if (entity === UserOrganization) return memberRepo;
      throw new Error(`Unexpected entity: ${String(entity)}`);
    }),
  } as unknown as DataSource;
}

// ─── describe: runBootstrapAdmin ───────────────────────────────────────────

describe("runBootstrapAdmin(ds)", () => {
  let exitSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  const origEnv = {
    ADMIN_USERNAME: process.env.ADMIN_USERNAME,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_ORG_NAME: process.env.ADMIN_ORG_NAME,
  };

  beforeEach(() => {
    exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
      throw EXIT_ERROR;
    });
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD = "secret";
    delete process.env.ADMIN_ORG_NAME;
  });

  afterEach(() => {
    if (origEnv.ADMIN_USERNAME !== undefined) {
      process.env.ADMIN_USERNAME = origEnv.ADMIN_USERNAME;
    } else {
      delete process.env.ADMIN_USERNAME;
    }
    if (origEnv.ADMIN_EMAIL !== undefined) {
      process.env.ADMIN_EMAIL = origEnv.ADMIN_EMAIL;
    } else {
      delete process.env.ADMIN_EMAIL;
    }
    if (origEnv.ADMIN_PASSWORD !== undefined) {
      process.env.ADMIN_PASSWORD = origEnv.ADMIN_PASSWORD;
    } else {
      delete process.env.ADMIN_PASSWORD;
    }
    if (origEnv.ADMIN_ORG_NAME !== undefined) {
      process.env.ADMIN_ORG_NAME = origEnv.ADMIN_ORG_NAME;
    } else {
      delete process.env.ADMIN_ORG_NAME;
    }
    jest.restoreAllMocks();
  });

  describe("env-var guard", () => {
    it.each([
      ["ADMIN_USERNAME", undefined],
      ["ADMIN_USERNAME", ""],
      ["ADMIN_EMAIL", undefined],
      ["ADMIN_EMAIL", ""],
      ["ADMIN_PASSWORD", undefined],
      ["ADMIN_PASSWORD", ""],
    ])("exits with code 1 when %s is %s", async (varName, value) => {
      if (value === undefined) {
        delete process.env[varName];
      } else {
        process.env[varName] = value;
      }

      const userRepo = buildMockUserRepo();
      const ds = buildDs(userRepo);

      await expect(runBootstrapAdmin(ds)).rejects.toBe(EXIT_ERROR);
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("ADMIN_USERNAME"),
      );
      // Should not have reached the DB.
      expect(userRepo.findOne).not.toHaveBeenCalled();
      expect(userRepo.create).not.toHaveBeenCalled();
      expect(userRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("idempotent skip", () => {
    it("skips user creation and logs when username already exists", async () => {
      const userRepo = buildMockUserRepo({
        id: "existing-id",
        username: "admin",
        email: "other@x.com",
      });
      const ds = buildDs(userRepo);

      await runBootstrapAdmin(ds);

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Skipping"));
      expect(userRepo.create).not.toHaveBeenCalled();
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it("skips user creation and logs when email already exists", async () => {
      const userRepo = buildMockUserRepo({
        id: "existing-id",
        username: "other",
        email: "admin@example.com",
      });
      const ds = buildDs(userRepo);

      await runBootstrapAdmin(ds);

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Skipping"));
      expect(userRepo.create).not.toHaveBeenCalled();
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it("calls findOne with the correct OR clause", async () => {
      const userRepo = buildMockUserRepo(null);
      const ds = buildDs(userRepo);

      await runBootstrapAdmin(ds);

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: [{ username: "admin" }, { email: "admin@example.com" }],
      });
    });
  });

  describe("success path", () => {
    it("creates and saves the user with the correct fields", async () => {
      const userRepo = buildMockUserRepo(null);
      const ds = buildDs(userRepo);

      await runBootstrapAdmin(ds);

      expect(userRepo.create).toHaveBeenCalledWith({
        username: "admin",
        email: "admin@example.com",
        displayName: "admin",
        password: "secret",
        roles: ["user", "admin"],
      });
      expect(userRepo.save).toHaveBeenCalledTimes(1);
    });

    it("logs success after saving", async () => {
      const userRepo = buildMockUserRepo(null);
      const ds = buildDs(userRepo);

      await runBootstrapAdmin(ds);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Bootstrap admin user created: admin"),
      );
    });
  });

  describe("duplicate-key race condition", () => {
    it("swallows QueryFailedError with 'unique' in message and logs skip", async () => {
      const raceUser = { id: "race-uuid", username: "admin" } as User;
      const userRepo = buildMockUserRepo(null);
      userRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(raceUser);
      const uniqueError = new QueryFailedError(
        "INSERT",
        [],
        new Error("unique constraint violation"),
      );
      userRepo.save.mockRejectedValueOnce(uniqueError);
      const ds = buildDs(userRepo);

      await expect(runBootstrapAdmin(ds)).resolves.toBeUndefined();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("concurrent write resolved"),
      );
    });

    it("rethrows QueryFailedError that does not mention 'unique'", async () => {
      const userRepo = buildMockUserRepo(null);
      const otherError = new QueryFailedError(
        "INSERT",
        [],
        new Error("foreign key violation"),
      );
      userRepo.save.mockRejectedValueOnce(otherError);
      const ds = buildDs(userRepo);

      await expect(runBootstrapAdmin(ds)).rejects.toBe(otherError);
    });

    it("rethrows non-QueryFailedError errors from save", async () => {
      const userRepo = buildMockUserRepo(null);
      const genericError = new Error("connection lost");
      userRepo.save.mockRejectedValueOnce(genericError);
      const ds = buildDs(userRepo);

      await expect(runBootstrapAdmin(ds)).rejects.toBe(genericError);
    });
  });

  describe("org creation (ADMIN_ORG_NAME set)", () => {
    beforeEach(() => {
      process.env.ADMIN_ORG_NAME = "Farm Demo";
    });

    it("does not call org repos when ADMIN_ORG_NAME is unset", async () => {
      delete process.env.ADMIN_ORG_NAME;
      const userRepo = buildMockUserRepo(null);
      const orgRepo = buildMockOrgRepo();
      const memberRepo = buildMockMemberRepo();
      const ds = buildDs(userRepo, orgRepo, memberRepo);

      await runBootstrapAdmin(ds);

      expect(orgRepo.findOne).not.toHaveBeenCalled();
      expect(memberRepo.findOne).not.toHaveBeenCalled();
    });

    it("creates org with correct slug and membership when user and org are new", async () => {
      const userRepo = buildMockUserRepo(null);
      const orgRepo = buildMockOrgRepo(null);
      const memberRepo = buildMockMemberRepo(null);
      const ds = buildDs(userRepo, orgRepo, memberRepo);

      await runBootstrapAdmin(ds);

      expect(orgRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Farm Demo", slug: "farm-demo" }),
      );
      expect(orgRepo.save).toHaveBeenCalledTimes(1);
      expect(memberRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: OrgRole.OWNER }),
      );
      expect(memberRepo.save).toHaveBeenCalledTimes(1);
    });

    it("still creates org when user already existed", async () => {
      const userRepo = buildMockUserRepo({
        id: "existing-user-id",
        username: "admin",
        email: "admin@example.com",
      });
      const orgRepo = buildMockOrgRepo(null);
      const memberRepo = buildMockMemberRepo(null);
      const ds = buildDs(userRepo, orgRepo, memberRepo);

      await runBootstrapAdmin(ds);

      // user was NOT re-created
      expect(userRepo.save).not.toHaveBeenCalled();
      // but org IS created with the existing user's id as ownerId
      expect(orgRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Farm Demo",
          ownerId: "existing-user-id",
        }),
      );
      expect(orgRepo.save).toHaveBeenCalledTimes(1);
    });

    it("patches ownerId and creates membership when org exists without ownerId", async () => {
      const userRepo = buildMockUserRepo(null);
      const existingOrg = {
        id: "org-uuid",
        name: "Farm Demo",
        slug: "farm-demo",
        ownerId: null,
      } as unknown as Organization;
      const orgRepo = buildMockOrgRepo(existingOrg);
      const memberRepo = buildMockMemberRepo(null);
      const ds = buildDs(userRepo, orgRepo, memberRepo);

      await runBootstrapAdmin(ds);

      // org NOT re-created
      expect(orgRepo.create).not.toHaveBeenCalled();
      expect(orgRepo.save).not.toHaveBeenCalled();
      // ownerId patched
      expect(orgRepo.update).toHaveBeenCalledWith(
        "org-uuid",
        expect.objectContaining({ ownerId: "user-uuid" }),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Patched ownerId"),
      );
      // membership still created
      expect(memberRepo.save).toHaveBeenCalledTimes(1);
    });

    it("skips update when org already has an ownerId", async () => {
      const userRepo = buildMockUserRepo(null);
      const existingOrg = {
        id: "org-uuid",
        name: "Farm Demo",
        slug: "farm-demo",
        ownerId: "some-other-owner",
      } as unknown as Organization;
      const orgRepo = buildMockOrgRepo(existingOrg);
      const memberRepo = buildMockMemberRepo(null);
      const ds = buildDs(userRepo, orgRepo, memberRepo);

      await runBootstrapAdmin(ds);

      expect(orgRepo.create).not.toHaveBeenCalled();
      expect(orgRepo.update).not.toHaveBeenCalled();
      expect(memberRepo.save).toHaveBeenCalledTimes(1);
    });

    it("skips membership creation when membership already exists", async () => {
      const userRepo = buildMockUserRepo(null);
      const orgRepo = buildMockOrgRepo(null);
      const existingMembership = {
        id: "mem-uuid",
        userId: "user-uuid",
        organizationId: "org-uuid",
        role: OrgRole.OWNER,
      } as UserOrganization;
      const memberRepo = buildMockMemberRepo(existingMembership);
      const ds = buildDs(userRepo, orgRepo, memberRepo);

      await runBootstrapAdmin(ds);

      expect(memberRepo.create).not.toHaveBeenCalled();
      expect(memberRepo.save).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Skipping membership creation"),
      );
    });

    it("logs org and membership creation on success", async () => {
      const userRepo = buildMockUserRepo(null);
      const orgRepo = buildMockOrgRepo(null);
      const memberRepo = buildMockMemberRepo(null);
      const ds = buildDs(userRepo, orgRepo, memberRepo);

      await runBootstrapAdmin(ds);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Bootstrap organization created: Farm Demo"),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Admin added as OWNER to organization"),
      );
    });
  });
});

// ─── describe: run() ──────────────────────────────────────────────────────

describe("run()", () => {
  let exitSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  const origEnv = {
    ADMIN_USERNAME: process.env.ADMIN_USERNAME,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_ORG_NAME: process.env.ADMIN_ORG_NAME,
  };

  beforeEach(() => {
    exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
      throw EXIT_ERROR;
    });
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Valid env for all run() tests; specific cases override below.
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD = "secret";
    delete process.env.ADMIN_ORG_NAME;

    // Reset mock state before each test.
    mockedDs.isInitialized = false;
    mockedDs.initialize.mockReset();
    mockedDs.destroy.mockReset();
    mockedDs.getRepository.mockReset();

    // Default success behaviour: initialize sets isInitialized=true.
    mockedDs.initialize.mockImplementation(() => {
      mockedDs.isInitialized = true;
      return Promise.resolve();
    });
    mockedDs.destroy.mockResolvedValue(undefined);

    // Default getRepository returns a no-op repo (user not found → creates).
    const mockRepo = buildMockUserRepo(null);
    mockedDs.getRepository.mockReturnValue(mockRepo);
  });

  afterEach(() => {
    if (origEnv.ADMIN_USERNAME !== undefined) {
      process.env.ADMIN_USERNAME = origEnv.ADMIN_USERNAME;
    } else {
      delete process.env.ADMIN_USERNAME;
    }
    if (origEnv.ADMIN_EMAIL !== undefined) {
      process.env.ADMIN_EMAIL = origEnv.ADMIN_EMAIL;
    } else {
      delete process.env.ADMIN_EMAIL;
    }
    if (origEnv.ADMIN_PASSWORD !== undefined) {
      process.env.ADMIN_PASSWORD = origEnv.ADMIN_PASSWORD;
    } else {
      delete process.env.ADMIN_PASSWORD;
    }
    if (origEnv.ADMIN_ORG_NAME !== undefined) {
      process.env.ADMIN_ORG_NAME = origEnv.ADMIN_ORG_NAME;
    } else {
      delete process.env.ADMIN_ORG_NAME;
    }
    jest.restoreAllMocks();
  });

  it("initializes the data source, runs bootstrap, then destroys", async () => {
    await run();

    expect(mockedDs.initialize).toHaveBeenCalledTimes(1);
    expect(mockedDs.destroy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Bootstrap completed successfully"),
    );
  });

  it("calls destroy in the finally block even when bootstrap throws", async () => {
    const boom = new Error("db error");
    mockedDs.getRepository.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockRejectedValue(boom),
    });

    await expect(run()).rejects.toBe(EXIT_ERROR);

    expect(mockedDs.destroy).toHaveBeenCalledTimes(1);
  });

  it("does NOT call destroy when initialize fails and isInitialized stays false", async () => {
    mockedDs.initialize.mockRejectedValue(new Error("connection refused"));
    // isInitialized remains false (set in beforeEach).

    await expect(run()).rejects.toBe(EXIT_ERROR);

    expect(mockedDs.destroy).not.toHaveBeenCalled();
  });

  it("exits with code 1 when an error is thrown", async () => {
    mockedDs.initialize.mockRejectedValue(new Error("oops"));

    await expect(run()).rejects.toBe(EXIT_ERROR);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(
      "Bootstrap failed:",
      expect.any(Error),
    );
  });
});
