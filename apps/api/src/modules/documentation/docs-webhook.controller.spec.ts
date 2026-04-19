import * as crypto from "crypto";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { getQueueToken } from "@nestjs/bullmq";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { DocsWebhookController } from "./docs-webhook.controller";
import { DocsWebhookDto } from "./dto/docs-webhook.dto";
import { QUEUE_NAMES } from "../../common/queues/queue-names";

const SECRET = "test-hmac-secret";

/**
 * Computes a valid X-Hub-Signature-256 header value for the given payload
 * using the shared test secret.
 */
function makeSignature(body: object, secret: string = SECRET): string {
  return (
    "sha256=" +
    crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(body))
      .digest("hex")
  );
}

/**
 * Creates a minimal Express-like request object for test purposes.
 * The rawBody field mirrors the behaviour configured in main.ts via the
 * express.json verify callback.
 */
function makeReq(body: object): { rawBody: Buffer } {
  return { rawBody: Buffer.from(JSON.stringify(body)) };
}

describe("DocsWebhookController", () => {
  let controller: DocsWebhookController;
  let buildQueue: { add: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    buildQueue = { add: jest.fn().mockResolvedValue({ id: "job-1" }) };
    configService = { get: jest.fn().mockReturnValue(SECRET) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocsWebhookController],
      providers: [
        {
          provide: getQueueToken(QUEUE_NAMES.DOCS_BUILD),
          useValue: buildQueue,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    controller = module.get<DocsWebhookController>(DocsWebhookController);
  });

  afterEach(() => jest.clearAllMocks());

  // FARM-ST374
  it("returns 401 when X-Hub-Signature-256 is invalid", async () => {
    const body: DocsWebhookDto = {
      ref: "refs/heads/main",
      repository: { clone_url: "https://github.com/acme/docs.git" },
    };
    const req = makeReq(body);

    await expect(
      controller.handleWebhook("sha256=invalidsignature", req as never, body),
    ).rejects.toThrow(UnauthorizedException);

    expect(buildQueue.add).not.toHaveBeenCalled();
  });

  // FARM-ST375
  it("returns { queued: false } when push has no docs changes", async () => {
    const body: DocsWebhookDto = {
      ref: "refs/heads/main",
      repository: { clone_url: "https://github.com/acme/docs.git" },
      commits: [
        {
          added: ["src/app.ts"],
          removed: [],
          modified: ["src/main.ts", "package.json"],
        },
      ],
    };
    const sig = makeSignature(body);
    const req = makeReq(body);

    const result = await controller.handleWebhook(sig, req as never, body);

    expect(result).toEqual({ queued: false });
    expect(buildQueue.add).not.toHaveBeenCalled();
  });

  it("enqueues DocsBuildJob and returns { queued: true } when push has .md changes", async () => {
    const body: DocsWebhookDto = {
      ref: "refs/heads/main",
      repository: { clone_url: "https://github.com/acme/docs.git" },
      commits: [
        {
          added: ["docs/getting-started.md"],
          removed: [],
          modified: [],
        },
      ],
    };
    const sig = makeSignature(body);
    const req = makeReq(body);

    const result = await controller.handleWebhook(sig, req as never, body);

    expect(result).toEqual({ queued: true });
    expect(buildQueue.add).toHaveBeenCalledWith(QUEUE_NAMES.DOCS_BUILD, {
      repoUrl: "https://github.com/acme/docs.git",
      ref: "refs/heads/main",
      componentId: null,
    });
  });

  it("enqueues a build when commits include a modified mkdocs.yml", async () => {
    const body: DocsWebhookDto = {
      ref: "refs/tags/v2.0.0",
      repository: { clone_url: "https://github.com/acme/docs.git" },
      commits: [
        {
          added: [],
          removed: [],
          modified: ["mkdocs.yml"],
        },
      ],
    };
    const sig = makeSignature(body);
    const req = makeReq(body);

    const result = await controller.handleWebhook(sig, req as never, body);

    expect(result).toEqual({ queued: true });
    expect(buildQueue.add).toHaveBeenCalledWith(QUEUE_NAMES.DOCS_BUILD, {
      repoUrl: "https://github.com/acme/docs.git",
      ref: "refs/tags/v2.0.0",
      componentId: null,
    });
  });

  it("treats a push with no commit list as relevant and enqueues a build", async () => {
    const body: DocsWebhookDto = {
      ref: "refs/heads/main",
      repository: { clone_url: "https://github.com/acme/docs.git" },
    };
    const sig = makeSignature(body);
    const req = makeReq(body);

    const result = await controller.handleWebhook(sig, req as never, body);

    expect(result).toEqual({ queued: true });
    expect(buildQueue.add).toHaveBeenCalled();
  });

  it("rejects with 403 when DOCS_WEBHOOK_SECRET is not configured", async () => {
    configService.get.mockReturnValue("");

    const body: DocsWebhookDto = {
      ref: "refs/heads/main",
      repository: { clone_url: "https://github.com/acme/docs.git" },
    };
    const req = makeReq(body);

    await expect(
      controller.handleWebhook(undefined, req as never, body),
    ).rejects.toThrow(ForbiddenException);

    expect(buildQueue.add).not.toHaveBeenCalled();
  });

  it("rejects with 401 when X-Hub-Signature-256 header is absent and secret is configured", async () => {
    const body: DocsWebhookDto = {
      ref: "refs/heads/main",
      repository: { clone_url: "https://github.com/acme/docs.git" },
    };
    const req = makeReq(body);

    await expect(
      controller.handleWebhook(undefined, req as never, body),
    ).rejects.toThrow(UnauthorizedException);

    expect(buildQueue.add).not.toHaveBeenCalled();
  });

  it("falls back to JSON.stringify when rawBody is absent on the request", async () => {
    const body: DocsWebhookDto = {
      ref: "refs/heads/main",
      repository: { clone_url: "https://github.com/acme/docs.git" },
    };
    const sig = makeSignature(body);

    const result = await controller.handleWebhook(sig, {} as never, body);

    expect(result).toEqual({ queued: true });
    expect(buildQueue.add).toHaveBeenCalled();
  });

  it("treats a commit with undefined added/removed/modified fields as relevant", async () => {
    const body: DocsWebhookDto = {
      ref: "refs/heads/main",
      repository: { clone_url: "https://github.com/acme/docs.git" },
      commits: [{}],
    };
    const sig = makeSignature(body);
    const req = makeReq(body);

    const result = await controller.handleWebhook(sig, req as never, body);

    expect(result).toEqual({ queued: false });
  });
});
