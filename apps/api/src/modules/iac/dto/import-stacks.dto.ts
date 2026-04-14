import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUrl,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Describes a single IaC stack to be imported or updated in bulk.
 */
export class ImportStackItemDto {
  @ApiProperty({
    example: "core-networking",
    description: "Stack name — must be unique within the environment",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: "production",
    description: "Target deployment environment",
  })
  @IsString()
  @IsNotEmpty()
  environment: string;

  @ApiPropertyOptional({
    example: "terraform",
    description: "IaC provider (terraform / opentofu)",
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({
    example: "https://github.com/acme/infra",
    description: "Source repository URL",
  })
  @IsOptional()
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  repositoryUrl?: string;

  @ApiPropertyOptional({
    example: "stacks/core-networking",
    description: "Path to the stack within the repository",
  })
  @IsOptional()
  @IsString()
  basePath?: string;

  @ApiPropertyOptional({
    example: "https://app.terraform.io/app/acme/workspaces/core-networking",
    description: "Deep link to the external IaC tool",
  })
  @IsOptional()
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  externalToolUrl?: string;

  @ApiPropertyOptional({
    example: ["comp-uuid-1", "comp-uuid-2"],
    description:
      "Optional list of dependency stack names (informational only; not persisted as a relation)",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];
}

/**
 * Payload for bulk importing or updating IaC stack records from Cultivator
 * discovery output.
 */
export class ImportStacksDto {
  @ApiProperty({
    type: [ImportStackItemDto],
    description: "List of stacks to import or update",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportStackItemDto)
  stacks: ImportStackItemDto[];
}
