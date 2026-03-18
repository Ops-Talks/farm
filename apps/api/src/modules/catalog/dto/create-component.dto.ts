import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsArray,
  IsObject,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import {
  ComponentKind,
  ComponentLifecycle,
  HelmChartMetadata,
} from "../entities/component.entity";

/**
 * Data Transfer Object for the optional Helm chart metadata nested in a component.
 */
export class HelmChartMetadataDto implements HelmChartMetadata {
  @ApiProperty({
    example: "https://charts.bitnami.com/bitnami",
    description: "Helm repository URL",
    required: false,
  })
  @IsString()
  @IsOptional()
  repo?: string;

  @ApiProperty({
    example: "postgresql",
    description: "Helm chart name",
    required: false,
  })
  @IsString()
  @IsOptional()
  chart?: string;

  @ApiProperty({
    example: "12.1.0",
    description: "Pinned chart version",
    required: false,
  })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiProperty({
    example: "my-values-secret",
    description: "URL or Kubernetes Secret name referencing a values file",
    required: false,
  })
  @IsString()
  @IsOptional()
  valuesRef?: string;
}

/**
 * Data Transfer Object for creating a new component in the catalog.
 */
export class CreateComponentDto {
  @ApiProperty({ example: "user-service", description: "The component name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: ComponentKind,
    example: ComponentKind.SERVICE,
    description: "The kind of component",
  })
  @IsEnum(ComponentKind)
  kind: ComponentKind;

  @ApiProperty({
    example: "Handles user authentication and profiles",
    description: "Brief description of the component",
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: "platform-team",
    description: "Team or individual owner",
  })
  @IsString()
  @IsNotEmpty()
  owner: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440050",
    description: "UUID of the owning team (alternative to owner string)",
    required: false,
  })
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @ApiProperty({
    enum: ComponentLifecycle,
    example: ComponentLifecycle.PRODUCTION,
    description: "Lifecycle status",
    required: false,
  })
  @IsEnum(ComponentLifecycle)
  @IsOptional()
  lifecycle?: ComponentLifecycle;

  @ApiProperty({
    example: ["java", "auth"],
    description: "Tags for categorization",
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    example: { repo: "github.com/org/repo" },
    description: "Arbitrary metadata",
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty({
    type: HelmChartMetadataDto,
    description: "Helm chart metadata for this component",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => HelmChartMetadataDto)
  helmChart?: HelmChartMetadata | null;

  @ApiProperty({
    example: ["550e8400-e29b-41d4-a716-446655440001"],
    description: "IDs of components this component depends on",
    required: false,
  })
  @IsArray()
  @IsUUID("4", { each: true })
  @IsOptional()
  dependencyIds?: string[];
}
