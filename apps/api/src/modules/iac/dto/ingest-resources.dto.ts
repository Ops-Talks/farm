import { IsArray, IsNotEmpty, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

class ResourceItemDto {
  @ApiProperty({
    example: "aws_instance.web",
    description: "Resource address in the IaC state",
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: "aws_instance", description: "Resource type" })
  @IsString()
  @IsNotEmpty()
  resourceType: string;

  @ApiProperty({ example: "web", description: "Resource name" })
  @IsString()
  @IsNotEmpty()
  resourceName: string;

  @ApiProperty({ example: "aws", description: "IaC provider" })
  @IsString()
  @IsNotEmpty()
  provider: string;
}

class DependencyItemDto {
  @ApiProperty({
    example: "aws_instance.web",
    description: "Source resource address of the dependency edge",
  })
  @IsString()
  @IsNotEmpty()
  source: string;

  @ApiProperty({
    example: "aws_security_group.web",
    description: "Target resource address of the dependency edge",
  })
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
  @ApiProperty({
    type: [ResourceItemDto],
    description: "List of resources to ingest",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceItemDto)
  resources: ResourceItemDto[];

  @ApiProperty({
    type: [DependencyItemDto],
    description: "List of dependency edges between resources",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DependencyItemDto)
  dependencies: DependencyItemDto[];
}
