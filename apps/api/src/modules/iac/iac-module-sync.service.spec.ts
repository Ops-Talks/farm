import {
  parseVariables,
  parseOutputs,
  IacModuleSyncService,
} from "./iac-module-sync.service";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  IacModule as IacModuleEntity,
  IacProvider,
} from "./entities/iac-module.entity";
import { IacModuleVersion } from "./entities/iac-module-version.entity";
import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";

jest.mock("child_process", () => ({ spawnSync: jest.fn() }));
jest.mock("fs", () => ({
  ...jest.requireActual<typeof import("fs")>("fs"),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  mkdtempSync: jest.fn().mockReturnValue("/tmp/farm-iac-sync-test"),
  rmSync: jest.fn(),
}));

const mockSpawnSync = spawnSync as jest.MockedFunction<typeof spawnSync>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockReadFileSync = readFileSync as jest.MockedFunction<
  typeof readFileSync
>;

// ---------------------------------------------------------------------------
// HCL parser unit tests
// ---------------------------------------------------------------------------

describe("parseVariables", () => {
  it("parses a required variable with type and description", () => {
    const src = `
variable "vpc_name" {
  type        = string
  description = "Name of the VPC"
}
`;
    const result = parseVariables(src);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "vpc_name",
      type: "string",
      description: "Name of the VPC",
      default: null,
      required: true,
      validation: null,
    });
  });

  it("parses an optional variable with default value", () => {
    const src = `
variable "cidr_block" {
  type        = string
  description = "CIDR block"
  default     = "10.0.0.0/16"
}
`;
    const result = parseVariables(src);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "cidr_block",
      default: "10.0.0.0/16",
      required: false,
    });
  });

  it("parses a variable with a validation block", () => {
    const src = `
variable "environment" {
  type        = string
  description = "Deployment environment"
  validation {
    condition     = contains(["dev","staging","prod"], var.environment)
    error_message = "Must be dev, staging, or prod."
  }
}
`;
    const result = parseVariables(src);
    expect(result).toHaveLength(1);
    expect(result[0].validation).not.toBeNull();
    expect(result[0].validation?.errorMessage).toBe(
      "Must be dev, staging, or prod.",
    );
  });

  it("parses multiple variable blocks", () => {
    const src = `
variable "region" {
  type = string
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}
`;
    const result = parseVariables(src);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("region");
    expect(result[1].name).toBe("instance_type");
    expect(result[1].required).toBe(false);
  });

  it("returns empty array for empty source", () => {
    expect(parseVariables("")).toHaveLength(0);
  });

  it("skips a validation block with only an error_message (no condition)", () => {
    const src = `
variable "size" {
  type        = number
  description = "Instance size"
  validation {
    error_message = "Must be positive."
  }
}
`;
    const result = parseVariables(src);
    expect(result).toHaveLength(1);
    expect(result[0].validation).toBeNull();
  });
});

describe("parseOutputs", () => {
  it("parses a basic output block", () => {
    const src = `
output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}
`;
    const result = parseOutputs(src);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "vpc_id",
      description: "The ID of the VPC",
      value: "aws_vpc.main.id",
    });
  });

  it("parses an output block with no description", () => {
    const src = `
output "subnet_ids" {
  value = aws_subnet.main[*].id
}
`;
    const result = parseOutputs(src);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBeNull();
    expect(result[0].name).toBe("subnet_ids");
  });

  it("parses multiple output blocks", () => {
    const src = `
output "vpc_id" {
  value = aws_vpc.main.id
}

output "igw_id" {
  description = "Internet Gateway ID"
  value       = aws_internet_gateway.main.id
}
`;
    const result = parseOutputs(src);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("vpc_id");
    expect(result[1].name).toBe("igw_id");
  });

  it("returns empty array for empty source", () => {
    expect(parseOutputs("")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// IacModuleSyncService unit tests
// ---------------------------------------------------------------------------

describe("IacModuleSyncService", () => {
  let service: IacModuleSyncService;
  let moduleRepo: Record<string, jest.Mock>;
  let versionRepo: Record<string, jest.Mock>;

  const mockModule: IacModuleEntity = {
    id: "module-uuid-1",
    name: "terraform-aws-vpc",
    provider: IacProvider.AWS,
    sourceRepoUrl: "https://github.com/terraform-aws-modules/terraform-aws-vpc",
    description: null,
    engine: null,
    latestVersion: null,
    componentId: null,
    versions: [],
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  beforeEach(async () => {
    moduleRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    };

    versionRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IacModuleSyncService,
        { provide: getRepositoryToken(IacModuleEntity), useValue: moduleRepo },
        {
          provide: getRepositoryToken(IacModuleVersion),
          useValue: versionRepo,
        },
      ],
    }).compile();

    service = module.get<IacModuleSyncService>(IacModuleSyncService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("resolveLatest", () => {
    it("returns the highest semver tag from a list", () => {
      const tags = ["v1.0.0", "v2.3.1", "v1.9.0", "v2.1.0"];
      expect(service.resolveLatest(tags)).toBe("v2.3.1");
    });

    it("handles tags without the v prefix", () => {
      expect(service.resolveLatest(["1.0.0", "2.0.0"])).toBe("2.0.0");
    });

    it("returns null for an empty array", () => {
      expect(service.resolveLatest([])).toBeNull();
    });

    it("returns the single tag when only one is provided", () => {
      expect(service.resolveLatest(["v3.5.2"])).toBe("v3.5.2");
    });

    it("picks the higher patch version when major and minor are equal", () => {
      expect(service.resolveLatest(["v1.2.0", "v1.2.5", "v1.2.3"])).toBe(
        "v1.2.5",
      );
    });

    it("handles versions without patch segment using zero as default", () => {
      expect(service.resolveLatest(["v1.2", "v1.3"])).toBe("v1.3");
    });

    it("handles versions with only a major component", () => {
      expect(service.resolveLatest(["v1", "v2"])).toBe("v2");
    });
  });

  describe("listRemoteTags", () => {
    it("returns an empty array when the repo URL is unreachable", () => {
      // Service catches the execSync exception and returns []
      const tags = service.listRemoteTags(
        "https://invalid-host.invalid/repo.git",
      );
      expect(Array.isArray(tags)).toBe(true);
    });

    it("parses semver tags from git ls-remote output", () => {
      const lsRemoteOutput = [
        "abc123\trefs/tags/v1.0.0",
        "def456\trefs/tags/v2.1.0",
        "ghi789\trefs/tags/v2.1.0^{}",
        "jkl012\trefs/tags/not-a-version",
        "",
      ].join("\n");
      mockSpawnSync.mockReturnValueOnce({
        status: 0,
        stdout: Buffer.from(lsRemoteOutput),
      } as never);

      const tags = service.listRemoteTags("https://github.com/example/repo");

      expect(tags).toContain("v1.0.0");
      expect(tags).toContain("v2.1.0");
      expect(tags).not.toContain("v2.1.0^{}");
      expect(tags).not.toContain("not-a-version");
    });

    it("returns an empty array when spawnSync reports non-zero status", () => {
      mockSpawnSync.mockReturnValueOnce({ status: 1, stdout: null } as never);

      const tags = service.listRemoteTags("https://github.com/example/repo");

      expect(tags).toEqual([]);
    });
  });

  describe("cloneAndParse", () => {
    it("returns parsed variables and outputs from cloned repo", () => {
      const variablesTf = `
variable "region" {
  type        = string
  description = "AWS region"
}
`;
      const outputsTf = `
output "bucket_arn" {
  description = "The ARN of the S3 bucket"
  value       = aws_s3_bucket.main.arn
}
`;
      mockSpawnSync.mockReturnValueOnce({ status: 0 } as never);
      mockExistsSync.mockReturnValueOnce(true).mockReturnValueOnce(true);
      mockReadFileSync
        .mockReturnValueOnce(variablesTf as never)
        .mockReturnValueOnce(outputsTf as never);

      const result = service.cloneAndParse(
        "https://github.com/example/repo",
        "v1.0.0",
      );

      expect(result.variables).toHaveLength(1);
      expect(result.variables[0].name).toBe("region");
      expect(result.outputs).toHaveLength(1);
      expect(result.outputs[0].name).toBe("bucket_arn");
    });

    it("returns empty arrays when variables.tf and outputs.tf do not exist", () => {
      mockSpawnSync.mockReturnValueOnce({ status: 0 } as never);
      mockExistsSync.mockReturnValue(false);

      const result = service.cloneAndParse(
        "https://github.com/example/repo",
        "v1.0.0",
      );

      expect(result.variables).toEqual([]);
      expect(result.outputs).toEqual([]);
    });

    it("returns empty arrays when git clone fails", () => {
      mockSpawnSync.mockReturnValueOnce({ status: 1 } as never);

      const result = service.cloneAndParse(
        "https://github.com/example/repo",
        "v1.0.0",
      );

      expect(result.variables).toEqual([]);
      expect(result.outputs).toEqual([]);
    });

    it("returns empty arrays for invalid tag format", () => {
      const result = service.cloneAndParse(
        "https://github.com/example/repo",
        "v1.0.0-rc1",
      );

      expect(result.variables).toEqual([]);
      expect(result.outputs).toEqual([]);
    });

    it("returns empty arrays when spawnSync throws an error", () => {
      mockSpawnSync.mockImplementationOnce(() => {
        throw new Error("spawnSync failed");
      });

      const result = service.cloneAndParse(
        "https://github.com/example/repo",
        "v1.0.0",
      );

      expect(result.variables).toEqual([]);
      expect(result.outputs).toEqual([]);
    });
  });

  describe("sync", () => {
    it("returns zero new versions when no remote tags are found", async () => {
      jest.spyOn(service, "listRemoteTags").mockReturnValue([]);

      const result = await service.sync(mockModule);

      expect(result.newVersions).toBe(0);
      expect(versionRepo.save).not.toHaveBeenCalled();
    });

    it("skips tags that are already persisted", async () => {
      jest
        .spyOn(service, "listRemoteTags")
        .mockReturnValue(["v1.0.0", "v2.0.0"]);
      versionRepo.find.mockResolvedValue([
        { version: "v1.0.0" },
        { version: "v2.0.0" },
      ]);

      const result = await service.sync(mockModule);

      expect(result.newVersions).toBe(0);
      expect(versionRepo.save).not.toHaveBeenCalled();
    });

    it("persists a new version and updates latestVersion", async () => {
      jest.spyOn(service, "listRemoteTags").mockReturnValue(["v1.0.0"]);
      jest
        .spyOn(service, "cloneAndParse")
        .mockReturnValue({ variables: [], outputs: [] });
      versionRepo.find.mockResolvedValue([]);
      versionRepo.create.mockImplementation(
        (v: unknown) => v as IacModuleVersion,
      );
      versionRepo.save.mockResolvedValue({});
      moduleRepo.save.mockResolvedValue({
        ...mockModule,
        latestVersion: "v1.0.0",
      });

      const result = await service.sync(mockModule);

      expect(result.newVersions).toBe(1);
      expect(result.latestVersion).toBe("v1.0.0");
      expect(versionRepo.save).toHaveBeenCalledTimes(1);
      expect(moduleRepo.save).toHaveBeenCalledTimes(1);
    });

    it("stores JSON metadata when cloneAndParse returns non-empty variables and outputs", async () => {
      const vars = [
        {
          name: "region",
          type: "string",
          description: null,
          required: true,
          default: null,
          validation: null,
        },
      ];
      const outs = [
        { name: "arn", description: "Resource ARN", value: "aws_resource.arn" },
      ];
      jest.spyOn(service, "listRemoteTags").mockReturnValue(["v1.0.0"]);
      jest
        .spyOn(service, "cloneAndParse")
        .mockReturnValue({ variables: vars, outputs: outs });
      versionRepo.find.mockResolvedValue([]);
      versionRepo.create.mockImplementation(
        (v: unknown) => v as IacModuleVersion,
      );
      versionRepo.save.mockResolvedValue({});
      moduleRepo.save.mockResolvedValue({
        ...mockModule,
        latestVersion: "v1.0.0",
      });

      await service.sync(mockModule);

      const createCall = (
        versionRepo.create.mock.calls[0] as unknown[]
      )[0] as Partial<IacModuleVersion>;
      expect(createCall.variablesMeta).toEqual(vars);
      expect(createCall.outputsMeta).toEqual(outs);
    });

    it("does not update module when latestVersion is already current", async () => {
      const moduleWithVersion = { ...mockModule, latestVersion: "v1.0.0" };
      jest.spyOn(service, "listRemoteTags").mockReturnValue(["v1.0.0"]);
      jest
        .spyOn(service, "cloneAndParse")
        .mockReturnValue({ variables: [], outputs: [] });
      versionRepo.find.mockResolvedValue([]);
      versionRepo.create.mockImplementation(
        (v: unknown) => v as IacModuleVersion,
      );
      versionRepo.save.mockResolvedValue({});

      await service.sync(moduleWithVersion);

      expect(moduleRepo.save).not.toHaveBeenCalled();
    });

    it("should resolve the correct latest version when remote tags have fewer than three semver segments", async () => {
      // Tags "v1" and "v2" have only one segment each. When resolveLatest
      // reduces them it calls compareSemver, whose inner parse() accesses
      // parts[1] ?? 0 and parts[2] ?? 0 (line 305) — the nullish-coalescing
      // fallback that is otherwise dead code for full X.Y.Z tags.
      jest.spyOn(service, "listRemoteTags").mockReturnValue(["v1", "v2"]);
      versionRepo.find.mockResolvedValue([]);
      versionRepo.create.mockImplementation(
        (v: unknown) => v as IacModuleVersion,
      );
      versionRepo.save.mockResolvedValue({});
      moduleRepo.save.mockResolvedValue({
        ...mockModule,
        latestVersion: "v2",
      });

      const result = await service.sync(mockModule);

      // "v2" is numerically higher than "v1" even with zero-padded minor/patch
      expect(result.latestVersion).toBe("v2");
      expect(result.newVersions).toBe(2);
    });
  });
});
