import { PartialType } from "@nestjs/swagger";
import { CreatePipelineDto } from "./create-pipeline.dto";

/**
 * DTO for partially updating an existing pipeline definition.
 * All fields from CreatePipelineDto are optional.
 */
export class UpdatePipelineDto extends PartialType(CreatePipelineDto) {}
