import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsUrl,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Describes a single module version drift entry reported by Agronomist.
 */
export class ModuleDriftItemDto {
  @ApiProperty({
    example: "stacks/core-networking/main.tf",
    description: "File path containing the outdated module reference",
  })
  @IsString()
  @IsNotEmpty()
  stackPath: string;

  @ApiProperty({
    example: "terraform-aws-modules/vpc/aws",
    description: "Module name as it appears in the source",
  })
  @IsString()
  @IsNotEmpty()
  moduleName: string;

  @ApiProperty({
    example: "registry.terraform.io/terraform-aws-modules/vpc/aws",
    description: "Full source URL for the module",
  })
  @IsUrl({ require_protocol: false })
  @IsNotEmpty()
  sourceUrl: string;

  @ApiProperty({
    example: "v3.14.0",
    description: "Currently pinned module reference",
  })
  @IsString()
  @IsNotEmpty()
  currentRef: string;

  @ApiProperty({
    example: "v3.19.0",
    description: "Latest available module reference",
  })
  @IsString()
  @IsNotEmpty()
  latestRef: string;
}

/**
 * Payload for bulk ingesting module drift data from an Agronomist scan.
 */
export class IngestModuleDriftDto {
  @ApiProperty({
    type: [ModuleDriftItemDto],
    description: "List of module drift entries detected in this scan",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleDriftItemDto)
  modules: ModuleDriftItemDto[];
}
