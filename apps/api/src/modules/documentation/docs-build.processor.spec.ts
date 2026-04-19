import { DocBuilder } from "./builders/doc-builder.interface";
import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Job } from "bullmq";
import { DocsBuildProcessor, DocsBuildJobData } from "./docs-build.processor";
import { DocumentationBuildService } from "./documentation-build.service";
import { DocBuilderFactory } from "./builders/doc-builder.factory";
import { DocumentationBuild } from "./entities/documentation-build.entity";

const makeBuild = (
  overrides: Partial<DocumentationBuild> = {},
): DocumentationBuild =>
  ({
    id: "build-uuid-1",
    componentId: "https://github.com/acme/docs.git",
    version: "main",
    sourceType: "markdown",
    status: "building",
    buildLog: null,
    artifactsPath: null,
    repoUrl: "https://github.com/acme/docs.git",
    triggeredAt: new Date("2024-01-01T00:00:00Z"),
    completedAt: null,
    ...overrides,
  }) as DocumentationBuild;

const makeJob = (data: DocsBuildJobData): Job<DocsBuildJobData> =>
  ({ id: "job-1", data }) as unknown as Job<DocsBuildJobData>;

describe("DocsBuildProcessor", () => {
  let processor: DocsBuildProcessor;
  let buildService: jest.Mocked<
    Pick<DocumentationBuildService, "create" | "updateStatus">
  >;
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    buildService = {
      create: jest.fn(),
      updateStatus: jest.fn(),
    };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocsBuildProcessor,
        { provide: DocumentationBuildService, useValue: buildService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    processor = module.get<DocsBuildProcessor>(DocsBuildProcessor);
  });

  afterEach(() => jest.clearAllMocks());

  it("creates a build record, resolves the correct builder, and marks it ready on success", async () => {
    const build = makeBuild();
    buildService.create.mockResolvedValue(build);
    buildService.updateStatus.mockResolvedValue(makeBuild({ status: "ready" }));

    const mockBuilder = {
      build: jest.fn().mockResolvedValue({
        status: "ready",
        artifactsPath: "/artifacts/acme/main",
        buildLog: "Build completed successfully",
      }),
    };
    jest
      .spyOn(DocBuilderFactory, "resolve")
      .mockResolvedValue(mockBuilder as unknown as DocBuilder);

    const job = makeJob({
      repoUrl: "https://github.com/acme/docs.git",
      ref: "refs/heads/main",
      componentId: null,
    });

    await processor.process(job);

    expect(buildService.create).toHaveBeenCalledWith(
      "https://github.com/acme/docs.git",
      "main",
      "markdown",
      "https://github.com/acme/docs.git",
    );
    expect(DocBuilderFactory.resolve).toHaveBeenCalledWith(
      "https://github.com/acme/docs.git",
      "refs/heads/main",
    );
    expect(mockBuilder.build).toHaveBeenCalledWith(
      "build-uuid-1",
      "https://github.com/acme/docs.git",
      "refs/heads/main",
    );
    expect(buildService.updateStatus).toHaveBeenCalledWith(
      "build-uuid-1",
      "ready",
      expect.objectContaining({
        artifactsPath: "/artifacts/acme/main",
        buildLog: "Build completed successfully",
        sourceType: "markdown",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        completedAt: expect.any(Date),
      }),
    );
  });

  it("marks the build as failed when builder.build() returns status: failed", async () => {
    const build = makeBuild();
    buildService.create.mockResolvedValue(build);
    buildService.updateStatus.mockResolvedValue(
      makeBuild({ status: "failed" }),
    );

    const mockBuilder = {
      build: jest.fn().mockResolvedValue({
        status: "failed",
        buildLog: "mkdocs command not found",
      }),
    };
    jest
      .spyOn(DocBuilderFactory, "resolve")
      .mockResolvedValue(mockBuilder as unknown as DocBuilder);

    const job = makeJob({
      repoUrl: "https://github.com/acme/docs.git",
      ref: "refs/tags/v1.0.0",
      componentId: null,
    });

    await processor.process(job);

    expect(buildService.updateStatus).toHaveBeenCalledWith(
      "build-uuid-1",
      "failed",
      expect.objectContaining({
        buildLog: "mkdocs command not found",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        completedAt: expect.any(Date),
      }),
    );
  });

  it("emits docs.build-complete event after processing", async () => {
    const build = makeBuild();
    buildService.create.mockResolvedValue(build);
    buildService.updateStatus.mockResolvedValue(makeBuild({ status: "ready" }));

    const mockBuilder = {
      build: jest.fn().mockResolvedValue({
        status: "ready",
        artifactsPath: "/artifacts/acme/main",
        buildLog: "ok",
      }),
    };
    jest
      .spyOn(DocBuilderFactory, "resolve")
      .mockResolvedValue(mockBuilder as unknown as DocBuilder);

    const job = makeJob({
      repoUrl: "https://github.com/acme/docs.git",
      ref: "refs/heads/main",
      componentId: null,
    });

    await processor.process(job);

    expect(eventEmitter.emit).toHaveBeenCalledWith("docs.build-complete", {
      buildId: "build-uuid-1",
      status: "ready",
    });
  });

  it("emits docs.build-complete with status failed when the builder throws", async () => {
    const build = makeBuild();
    buildService.create.mockResolvedValue(build);
    buildService.updateStatus.mockResolvedValue(
      makeBuild({ status: "failed" }),
    );

    jest
      .spyOn(DocBuilderFactory, "resolve")
      .mockRejectedValue(new Error("git clone failed"));

    const job = makeJob({
      repoUrl: "https://github.com/acme/docs.git",
      ref: "refs/heads/main",
      componentId: null,
    });

    await processor.process(job);

    expect(buildService.updateStatus).toHaveBeenCalledWith(
      "build-uuid-1",
      "failed",
      expect.objectContaining({ buildLog: "git clone failed" }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith("docs.build-complete", {
      buildId: "build-uuid-1",
      status: "failed",
    });
  });

  it("parses tag refs into a short version string", async () => {
    const build = makeBuild({ version: "v2.3.1" });
    buildService.create.mockResolvedValue(build);
    buildService.updateStatus.mockResolvedValue(makeBuild({ status: "ready" }));

    const mockBuilder = {
      build: jest.fn().mockResolvedValue({ status: "ready", buildLog: "" }),
    };
    jest
      .spyOn(DocBuilderFactory, "resolve")
      .mockResolvedValue(mockBuilder as unknown as DocBuilder);

    const job = makeJob({
      repoUrl: "https://github.com/acme/docs.git",
      ref: "refs/tags/v2.3.1",
      componentId: "comp-uuid-1",
    });

    await processor.process(job);

    expect(buildService.create).toHaveBeenCalledWith(
      "comp-uuid-1",
      "v2.3.1",
      "markdown",
      "https://github.com/acme/docs.git",
    );
  });
});
