import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsObject,
} from "class-validator";
import {
  ComponentKind,
  ComponentLifecycle,
} from "../entities/component.entity";

/**
 * Data Transfer Object for creating a new component in the catalog.
 */
export class CreateComponentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ComponentKind)
  kind: ComponentKind;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  owner: string;

  @IsEnum(ComponentLifecycle)
  @IsOptional()
  lifecycle?: ComponentLifecycle;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
