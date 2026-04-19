import { IsArray, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Represents the repository object included in a GitHub push webhook payload.
 */
export class DocsWebhookRepositoryDto {
  @ApiProperty({
    example: "https://github.com/acme/docs.git",
    description: "GitHub repository clone URL",
  })
  @IsString()
  clone_url: string;
}

/**
 * Data Transfer Object for an inbound GitHub push webhook payload.
 * Only fields required for documentation build triggering are declared here.
 */
export class DocsWebhookDto {
  @ApiProperty({
    example: "refs/heads/main",
    description: "The full Git ref that was pushed (branch or tag)",
  })
  @IsString()
  ref: string;

  @ApiProperty({ type: () => DocsWebhookRepositoryDto })
  @ValidateNested()
  @Type(() => DocsWebhookRepositoryDto)
  repository: DocsWebhookRepositoryDto;

  @ApiProperty({
    required: false,
    description: "List of commits included in the push event",
  })
  @IsOptional()
  @IsArray()
  commits?: Array<{
    added?: string[];
    removed?: string[];
    modified?: string[];
  }>;

  @ApiProperty({
    required: false,
    example: "abc1234",
    description: "SHA of the HEAD commit after the push",
  })
  @IsOptional()
  @IsString()
  after?: string;
}
