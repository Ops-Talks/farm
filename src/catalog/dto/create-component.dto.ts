import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsObject,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import {
  ComponentKind,
  ComponentLifecycle,
} from "../entities/component.entity";

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
}
