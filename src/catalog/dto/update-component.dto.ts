import { PartialType } from "@nestjs/swagger";
import { CreateComponentDto } from "./create-component.dto";

/**
 * Data Transfer Object for updating an existing component.
 * All fields from CreateComponentDto are optional.
 */
export class UpdateComponentDto extends PartialType(CreateComponentDto) {}
