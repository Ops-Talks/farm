import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { getToken } from "@willsoto/nestjs-prometheus";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CatalogService } from "./catalog.service";
import { EventsGateway } from "../../common/events/events.gateway";
import * as fs from "fs/promises";
import { EventEmitter } from "events";
import {
  Component,
  ComponentKind,
  ComponentKindGroup,
  ComponentLifecycle,
} from "./entities/component.entity";

jest.mock("fs/promises");
jest.mock("child_process", () => ({ spawn: jest.fn() }));

describe("CatalogService", () => {
  let service: CatalogService;

  const mockComponentOperationsCounter = { inc: jest.fn() };

  const mockComponent: Component = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "my-service",
    kind: ComponentKind.SERVICE,
    description: "A test service",
    owner: "team-a",
    teamId: null as unknown as string,
    team: null,
    lifecycle: ComponentLifecycle.PRODUCTION,
    tags: ["test"],
    links: [],
    metadata: {},
    helmChart: null,
    dependencies: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    organizationId: null as unknown as string,
  };

  const mockRepository = {
    create: jest.fn().mockImplementation((dto: any) => dto as Component),
    save: jest.fn().mockImplementation((component: Component) =>
      Promise.resolve({
        ...component,
        id: component.id || "550e8400-e29b-41d4-a716-446655440001",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Component),
    ),
    find: jest.fn().mockResolvedValue([mockComponent]),
    findAndCount: jest.fn().mockResolvedValue([[mockComponent], 1]),
    findBy: jest.fn().mockResolvedValue([mockComponent]),
    findOne: jest.fn().mockResolvedValue(mockComponent),
    findOneBy: jest.fn().mockResolvedValue(mockComponent),
    merge: jest.fn().mockImplementation(
      (entity: Component, dto: any) =>
        ({
          ...entity,
          ...dto,
        }) as Component,
    ),
    remove: jest.fn().mockResolvedValue(mockComponent),
  };

  const mockEventsGateway = {
    emitComponentCreated: jest.fn(),
    emitComponentUpdated: jest.fn(),
    emitComponentDeleted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        {
          provide: getRepositoryToken(Component),
          useValue: mockRepository,
        },
        {
          provide: EventsGateway,
          useValue: mockEventsGateway,
        },
        {
          provide: getToken("component_operations_total"),
          useValue: mockComponentOperationsCounter,
        },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("discoverFromLocation", () => {
    it("should discover and register a component", async () => {
      jest
        .spyOn(service as any, "gitClone")
        .mockImplementation(() => Promise.resolve());
      jest
        .spyOn(service as any, "findYamlFiles")
        .mockImplementation(() =>
          Promise.resolve(["/tmp/fake/catalog-info.yaml"]),
        );

      (fs.readFile as jest.Mock).mockResolvedValue(`
        apiVersion: farm.io/v1alpha1
        kind: Component
        metadata:
          name: discovered-service
        spec:
          type: service
          owner: team-discovered
      `);

      const result = await service.discoverFromLocation(
        "http://example.com/repo.git",
      );

      expect(result).toBe(1);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe("registerYaml", () => {
    it("should register a component from valid YAML", async () => {
      const yaml = `
apiVersion: farm.io/v1alpha1
kind: Component
metadata:
  name: yaml-service
  description: From YAML
spec:
  type: service
  owner: team-yaml
      `;
      const result = await service.registerYaml(yaml);
      expect(result.name).toBe("yaml-service");
      expect(result.owner).toBe("team-yaml");
    });
  });

  describe("create", () => {
    it("should create a component with dependencies", async () => {
      const dto = {
        name: "service-with-dep",
        kind: ComponentKind.SERVICE,
        owner: "team-a",
        dependencyIds: ["dep-1"],
      };
      await service.create(dto);
      expect(mockRepository.findBy).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it("should increment component_operations_total with operation=create", async () => {
      mockComponentOperationsCounter.inc.mockClear();
      await service.create({
        name: "new-service",
        kind: ComponentKind.SERVICE,
        owner: "team-a",
      });
      expect(mockComponentOperationsCounter.inc).toHaveBeenCalledWith({
        operation: "create",
      });
    });
  });

  describe("findAll", () => {
    it("should return all components with relations", async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockComponent], 1]);
      const [data, total] = await service.findAll();
      expect(data).toEqual([mockComponent]);
      expect(total).toBe(1);
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        relations: ["dependencies"],
        skip: 0,
        take: 20,
      });
    });
  });

  describe("findOne", () => {
    it("should return a component by ID with relations", async () => {
      await service.findOne(mockComponent.id);
      expect(mockRepository.findOne).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update dependencies", async () => {
      const dto = { dependencyIds: ["new-dep"] };
      await service.update(mockComponent.id, dto);
      expect(mockRepository.findBy).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it("should increment component_operations_total with operation=update", async () => {
      mockComponentOperationsCounter.inc.mockClear();
      await service.update(mockComponent.id, { description: "Updated" });
      expect(mockComponentOperationsCounter.inc).toHaveBeenCalledWith({
        operation: "update",
      });
    });
  });

  describe("remove", () => {
    it("should remove a component by ID", async () => {
      await service.remove(mockComponent.id);
      expect(mockRepository.remove).toHaveBeenCalledWith(mockComponent);
    });

    it("should increment component_operations_total with operation=delete", async () => {
      mockComponentOperationsCounter.inc.mockClear();
      await service.remove(mockComponent.id);
      expect(mockComponentOperationsCounter.inc).toHaveBeenCalledWith({
        operation: "delete",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Additional branch-coverage tests
  // ---------------------------------------------------------------------------

  describe("findOne — NotFoundException", () => {
    it("should throw NotFoundException when component does not exist", async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne("nonexistent-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findAll — kindGroup filter", () => {
    it("should filter by kindGroup when provided", async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockComponent], 1]);
      const [data, total] = await service.findAll(
        0,
        20,
        ComponentKindGroup.DEV,
      );
      expect(data).toEqual([mockComponent]);
      expect(total).toBe(1);
      expect(mockRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ relations: ["dependencies"] }),
      );
    });

    it("should include organizationId in where clause when kindGroup and organizationId are both provided", async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockComponent], 1]);
      await service.findAll(0, 20, ComponentKindGroup.DEV, "org-uuid-1");
      const callArg = (
        mockRepository.findAndCount.mock.calls as Array<
          [{ where: Array<Record<string, unknown>> }]
        >
      )[0][0];
      expect(
        callArg.where.some((w) => w["organizationId"] === "org-uuid-1"),
      ).toBe(true);
    });

    it("should include teamId in where clause when kindGroup and teamId are both provided", async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockComponent], 1]);
      await service.findAll(
        0,
        20,
        ComponentKindGroup.INFRA,
        undefined,
        "team-uuid-1",
      );
      const callArg = (
        mockRepository.findAndCount.mock.calls as Array<
          [{ where: Array<Record<string, unknown>> }]
        >
      )[0][0];
      expect(callArg.where.some((w) => w["teamId"] === "team-uuid-1")).toBe(
        true,
      );
    });
  });

  describe("findAll — organizationId / teamId without kindGroup", () => {
    it("should filter by organizationId when provided without kindGroup", async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockComponent], 1]);
      await service.findAll(0, 20, undefined, "org-uuid-1");
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { organizationId: "org-uuid-1" },
        relations: ["dependencies"],
        skip: 0,
        take: 20,
      });
    });

    it("should filter by teamId when provided without kindGroup", async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockComponent], 1]);
      await service.findAll(0, 20, undefined, undefined, "team-uuid-1");
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { teamId: "team-uuid-1" },
        relations: ["dependencies"],
        skip: 0,
        take: 20,
      });
    });

    it("should filter by both organizationId and teamId without kindGroup", async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockComponent], 1]);
      await service.findAll(0, 20, undefined, "org-uuid-1", "team-uuid-1");
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { organizationId: "org-uuid-1", teamId: "team-uuid-1" },
        relations: ["dependencies"],
        skip: 0,
        take: 20,
      });
    });
  });

  describe("registerYaml — error branches", () => {
    it("should throw BadRequestException when YAML kind is not Component", async () => {
      const yaml = `
apiVersion: farm.io/v1alpha1
kind: API
metadata:
  name: my-api
spec:
  owner: team-a
      `;
      await expect(service.registerYaml(yaml)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when YAML parses to null", async () => {
      await expect(service.registerYaml("null")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when component name is missing", async () => {
      const yaml = `
apiVersion: farm.io/v1alpha1
kind: Component
metadata:
  description: no name here
spec:
  type: service
  owner: team-a
      `;
      await expect(service.registerYaml(yaml)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when component owner is missing", async () => {
      const yaml = `
apiVersion: farm.io/v1alpha1
kind: Component
metadata:
  name: my-service
spec:
  type: service
      `;
      await expect(service.registerYaml(yaml)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when YAML content is syntactically invalid", async () => {
      await expect(
        service.registerYaml("{ invalid: yaml: [unclosed"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should use ComponentKind.SERVICE fallback when spec.type is absent", async () => {
      const yaml = `
apiVersion: farm.io/v1alpha1
kind: Component
metadata:
  name: no-type-service
spec:
  owner: team-a
      `;
      const result = await service.registerYaml(yaml);
      expect(result.kind).toBe(ComponentKind.SERVICE);
    });

    it("should use ComponentLifecycle.EXPERIMENTAL fallback when spec.lifecycle is absent", async () => {
      const yaml = `
apiVersion: farm.io/v1alpha1
kind: Component
metadata:
  name: no-lifecycle-service
spec:
  owner: team-a
      `;
      const result = await service.registerYaml(yaml);
      expect(result.lifecycle).toBe(ComponentLifecycle.EXPERIMENTAL);
    });

    it("should use empty-object metadata fallback when metadata section is absent", async () => {
      // When the YAML has no metadata section, parsed.metadata is undefined.
      // Line 166: `(undefined as Record<string, unknown>) || {}` uses the `{}` fallback.
      // The method still throws because dto.name is undefined.
      const yaml = `
apiVersion: farm.io/v1alpha1
kind: Component
spec:
  owner: team-a
      `;
      await expect(service.registerYaml(yaml)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should wrap a non-Error thrown by create() in a BadRequestException", async () => {
      // Cause the repository save (called by create) to throw a plain string
      // so that the catch block at line 186 uses `String(e)` rather than `e.message`.
      mockRepository.save.mockRejectedValueOnce("plain string error from db");

      const yaml = `
apiVersion: farm.io/v1alpha1
kind: Component
metadata:
  name: string-error-service
spec:
  owner: team-a
      `;
      await expect(service.registerYaml(yaml)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should register a component including helmChart when spec.helm is present", async () => {
      const yaml = `
apiVersion: farm.io/v1alpha1
kind: Component
metadata:
  name: helm-service
spec:
  type: service
  owner: team-helm
  helm:
    repo: https://charts.example.com
    chart: my-chart
    version: 1.0.0
    valuesRef: values-prod.yaml
      `;
      const result = await service.registerYaml(yaml);
      expect(result.name).toBe("helm-service");
    });
  });

  describe("validateGitUrl", () => {
    it("should throw BadRequestException for an empty string", () => {
      expect(() => (service as any).validateGitUrl("")).toThrow(
        "Repository URL must not be empty.",
      );
    });

    it("should throw BadRequestException for a whitespace-only string", () => {
      expect(() => (service as any).validateGitUrl("   ")).toThrow(
        "Repository URL must not be empty.",
      );
    });

    it("should throw BadRequestException for a value starting with '-'", () => {
      expect(() =>
        (service as any).validateGitUrl("--upload-pack=malicious"),
      ).toThrow("Invalid repository URL.");
    });

    it("should throw BadRequestException for a value starting with '-' (short flag)", () => {
      expect(() => (service as any).validateGitUrl("-e malicious")).toThrow(
        "Invalid repository URL.",
      );
    });

    it("should throw BadRequestException for an unparseable URL with a scheme", () => {
      expect(() =>
        (service as any).validateGitUrl("://not-a-valid-url"),
      ).toThrow("Invalid repository URL format.");
    });

    it("should throw BadRequestException for a git:// scheme URL", () => {
      expect(() =>
        (service as any).validateGitUrl("git://github.com/org/repo.git"),
      ).toThrow("Only HTTP(S) repository URLs are allowed.");
    });

    it("should throw BadRequestException for an ftp:// scheme URL", () => {
      expect(() =>
        (service as any).validateGitUrl("ftp://example.com/repo.git"),
      ).toThrow("Only HTTP(S) repository URLs are allowed.");
    });

    it("should throw BadRequestException for a file:// scheme URL", () => {
      expect(() =>
        (service as any).validateGitUrl("file:///etc/passwd"),
      ).toThrow("Only HTTP(S) repository URLs are allowed.");
    });

    it("should throw BadRequestException for a non-URL, non-SSH value without a scheme", () => {
      expect(() =>
        (service as any).validateGitUrl("not-a-valid-remote"),
      ).toThrow("Invalid repository URL.");
    });

    it("should not throw for a valid http:// URL", () => {
      expect(() =>
        (service as any).validateGitUrl("http://github.com/org/repo.git"),
      ).not.toThrow();
    });

    it("should not throw for a valid https:// URL", () => {
      expect(() =>
        (service as any).validateGitUrl("https://github.com/org/repo.git"),
      ).not.toThrow();
    });

    it("should not throw for a valid SSH-style remote (git@host:org/repo.git)", () => {
      expect(() =>
        (service as any).validateGitUrl("git@github.com:org/repo.git"),
      ).not.toThrow();
    });

    it("should not throw for an SSH-style remote with a numeric host part", () => {
      expect(() =>
        (service as any).validateGitUrl("git@192.168.1.1:org/repo.git"),
      ).not.toThrow();
    });
  });

  describe("discoverFromLocation — error branches", () => {
    beforeEach(() => {
      (fs.rm as jest.Mock).mockResolvedValue(undefined);
    });

    it("should throw BadRequestException when gitClone fails", async () => {
      jest
        .spyOn(service as any, "gitClone")
        .mockRejectedValue(new Error("git clone failed with code 128"));

      await expect(
        service.discoverFromLocation("http://bad-repo.example.git"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should wrap a non-Error thrown by gitClone in a BadRequestException using String()", async () => {
      jest
        .spyOn(service as any, "gitClone")
        .mockRejectedValue("non-error plain string");

      await expect(
        service.discoverFromLocation("http://bad-repo.example.git"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should log error and skip a file that fails to register with a non-Error, counting only successes", async () => {
      jest.spyOn(service as any, "gitClone").mockResolvedValue(undefined);
      jest
        .spyOn(service as any, "findYamlFiles")
        .mockResolvedValue([
          "/tmp/fake/file1/catalog-info.yaml",
          "/tmp/fake/file2/catalog-info.yaml",
        ]);

      // First file throws a plain string (non-Error), second returns valid YAML.
      (fs.readFile as jest.Mock).mockRejectedValueOnce(
        "plain string read error",
      ).mockResolvedValueOnce(`
apiVersion: farm.io/v1alpha1
kind: Component
metadata:
  name: good-service
spec:
  type: service
  owner: team-a
        `);

      const result = await service.discoverFromLocation(
        "http://example.com/repo.git",
      );
      expect(result).toBe(1);
    });

    it("should log error and skip a file that fails to register, counting only successes", async () => {
      jest.spyOn(service as any, "gitClone").mockResolvedValue(undefined);
      jest
        .spyOn(service as any, "findYamlFiles")
        .mockResolvedValue([
          "/tmp/fake/file1/catalog-info.yaml",
          "/tmp/fake/file2/catalog-info.yaml",
        ]);

      (fs.readFile as jest.Mock).mockRejectedValueOnce(
        new Error("file not readable"),
      ).mockResolvedValueOnce(`
apiVersion: farm.io/v1alpha1
kind: Component
metadata:
  name: good-service
spec:
  type: service
  owner: team-a
        `);

      const result = await service.discoverFromLocation(
        "http://example.com/repo.git",
      );
      // Only the second (valid) file succeeds.
      expect(result).toBe(1);
    });
  });

  describe("create — without optional providers", () => {
    it("should create a component when eventsGateway and eventEmitter are not provided", async () => {
      const moduleNoOptionals: TestingModule = await Test.createTestingModule({
        providers: [
          CatalogService,
          {
            provide: getRepositoryToken(Component),
            useValue: mockRepository,
          },
        ],
      }).compile();

      const svcNoOptionals =
        moduleNoOptionals.get<CatalogService>(CatalogService);

      const result = await svcNoOptionals.create({
        name: "bare-service",
        kind: ComponentKind.SERVICE,
        owner: "team-bare",
      });

      expect(result).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe("update — without dependencyIds", () => {
    it("should update without touching dependencies when dependencyIds is absent", async () => {
      // Restore findOne default after NotFoundException test mutated it.
      mockRepository.findOne.mockResolvedValue(mockComponent);

      const result = await service.update(mockComponent.id, {
        description: "New description",
      });
      // findBy should NOT be called since no dependencyIds were provided.
      expect(mockRepository.findBy).not.toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// gitClone internal branch tests (child_process.spawn mock)
// ---------------------------------------------------------------------------

describe("CatalogService — gitClone internal branches", () => {
  let service: CatalogService;
  let spawnMock: jest.Mock;

  const mockRepository = {
    create: jest.fn().mockImplementation((d) => d as Component),
    save: jest.fn().mockImplementation((d) => Promise.resolve(d as Component)),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    findBy: jest.fn().mockResolvedValue([]),
    merge: jest
      .fn()
      .mockImplementation((e, d) => ({ ...e, ...d }) as Component),
    remove: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const { spawn } = jest.requireMock("child_process") as unknown as {
      spawn: jest.Mock;
    };
    spawnMock = spawn;

    jest.clearAllMocks();

    (fs.rm as jest.Mock).mockResolvedValue(undefined);
    (fs.readdir as jest.Mock).mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: getRepositoryToken(Component), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
  });

  it("should resolve when git clone exits with code 0", async () => {
    const emitter = new EventEmitter();
    spawnMock.mockReturnValue(emitter);

    const clonePromise = service.discoverFromLocation(
      "http://example.com/repo.git",
    );
    // Simulate successful git process exit.
    process.nextTick(() => emitter.emit("close", 0));

    const count = await clonePromise;
    expect(count).toBe(0); // No YAML files found (readdir returns [])
    expect(spawnMock).toHaveBeenCalledWith("git", [
      "clone",
      "--depth",
      "1",
      "http://example.com/repo.git",
      expect.any(String),
    ]);
  });

  it("should reject when git clone exits with a non-zero code", async () => {
    const emitter = new EventEmitter();
    spawnMock.mockReturnValue(emitter);

    const clonePromise = service.discoverFromLocation(
      "http://example.com/repo.git",
    );
    process.nextTick(() => emitter.emit("close", 128));

    await expect(clonePromise).rejects.toThrow(BadRequestException);
  });

  it("should reject when the spawn process emits an error", async () => {
    const emitter = new EventEmitter();
    spawnMock.mockReturnValue(emitter);

    const clonePromise = service.discoverFromLocation(
      "http://example.com/repo.git",
    );
    process.nextTick(() =>
      emitter.emit("error", new Error("ENOENT: git not found")),
    );

    await expect(clonePromise).rejects.toThrow(BadRequestException);
  });

  it("should discover YAML files in nested directories via findYamlFiles", async () => {
    const emitter = new EventEmitter();
    spawnMock.mockReturnValue(emitter);

    // Top-level entries: a catalog-info.yaml, a regular file, and a subdirectory.
    const topLevelEntries = [
      { name: "catalog-info.yaml", isDirectory: () => false },
      { name: "README.md", isDirectory: () => false },
      { name: "subdir", isDirectory: () => true },
    ];
    // Subdir entries: a nested catalog-info.yaml.
    const subDirEntries = [
      { name: "catalog-info.yaml", isDirectory: () => false },
    ];

    (fs.readdir as jest.Mock)
      .mockResolvedValueOnce(topLevelEntries)
      .mockResolvedValueOnce(subDirEntries);

    (fs.readFile as jest.Mock).mockResolvedValue(`
apiVersion: farm.io/v1alpha1
kind: Component
metadata:
  name: test-service
spec:
  type: service
  owner: team-a
    `);

    const clonePromise = service.discoverFromLocation(
      "http://example.com/repo.git",
    );
    process.nextTick(() => emitter.emit("close", 0));

    const count = await clonePromise;
    // Both catalog-info.yaml files should be discovered and registered.
    expect(count).toBe(2);
  });
});
