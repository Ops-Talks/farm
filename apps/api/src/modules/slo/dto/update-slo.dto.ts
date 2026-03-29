import { PartialType } from "@nestjs/swagger";
import { CreateSloDto } from "./create-slo.dto";

/**
 * DTO for updating an existing Service Level Objective.
 * All fields are optional.
 */
export class UpdateSloDto extends PartialType(CreateSloDto) {}
