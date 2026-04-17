import { IsArray, IsNotEmpty, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class ResourceItemDto {
  @ApiProperty({ example: "aws_instance.web" })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: "aws_instance" })
  @IsString()
  @IsNotEmpty()
  resourceType: string;

  @ApiProperty({ example: "web" })
  @IsString()
  @IsNotEmpty()
  resourceName: string;

  @ApiProperty({ example: "aws" })
  @IsString()
  @IsNotEmpty()
  provider: string;
}

export class DependencyItemDto {
  @ApiProperty({ example: "aws_instance.web" })
  @IsString()
  @IsNotEmpty()
  source: string;

  @ApiProperty({ example: "aws_security_group.web" })
  @IsString()
  @IsNotEmpty()
  target: string;
}

/**
 * Payload accepted by the resource topology ingest endpoint.
 * Cultivator pushes a sanitized resource topology (addresses, types,
 * dependency edges) with no attribute values or secrets.
 */
export class IngestResourcesDto {
  @ApiProperty({ type: [ResourceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceItemDto)
  resources: ResourceItemDto[];

  @ApiProperty({ type: [DependencyItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DependencyItemDto)
  dependencies: DependencyItemDto[];
}
