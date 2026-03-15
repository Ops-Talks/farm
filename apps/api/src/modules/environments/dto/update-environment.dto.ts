import { PartialType } from "@nestjs/swagger";
import { CreateEnvironmentDto } from "./create-environment.dto";

/**
 * Data Transfer Object for updating an existing environment.
 * All fields from CreateEnvironmentDto are optional.
 */
export class UpdateEnvironmentDto extends PartialType(CreateEnvironmentDto) {}
