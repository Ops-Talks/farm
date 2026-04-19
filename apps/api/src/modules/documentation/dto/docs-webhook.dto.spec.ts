import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DocsWebhookDto, DocsWebhookRepositoryDto } from "./docs-webhook.dto";

describe("DocsWebhookDto", () => {
  it("transforms a plain object into a validated DocsWebhookDto with nested repository", async () => {
    const plain = {
      ref: "refs/heads/main",
      repository: { clone_url: "https://github.com/acme/docs.git" },
    };

    const dto = plainToInstance(DocsWebhookDto, plain);

    expect(dto).toBeInstanceOf(DocsWebhookDto);
    expect(dto.repository).toBeInstanceOf(DocsWebhookRepositoryDto);
    expect(dto.repository.clone_url).toBe("https://github.com/acme/docs.git");

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("reports validation errors when required fields are missing", async () => {
    const dto = plainToInstance(DocsWebhookDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("accepts optional commits and after fields", async () => {
    const plain = {
      ref: "refs/heads/main",
      repository: { clone_url: "https://github.com/acme/docs.git" },
      commits: [{ added: ["docs/guide.md"], removed: [], modified: [] }],
      after: "abc1234",
    };

    const dto = plainToInstance(DocsWebhookDto, plain);
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.after).toBe("abc1234");
    expect(dto.commits).toHaveLength(1);
  });

  it("resolves the @ApiProperty type factory for repository to DocsWebhookRepositoryDto", () => {
    const SWAGGER_API_MODEL_PROPERTIES = "swagger/apiModelProperties";
    const meta = Reflect.getMetadata(
      SWAGGER_API_MODEL_PROPERTIES,
      DocsWebhookDto.prototype,
      "repository",
    ) as { type?: () => unknown } | undefined;

    const resolvedType = meta?.type?.();
    expect(resolvedType).toBe(DocsWebhookRepositoryDto);
  });
});
