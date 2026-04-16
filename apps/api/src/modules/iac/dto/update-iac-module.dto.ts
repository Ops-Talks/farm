import { PartialType } from "@nestjs/swagger";
import { CreateIacModuleDto } from "./create-iac-module.dto";

/**
 * Payload for partially updating an existing IaC module catalog entry.
 * All fields from CreateIacModuleDto are optional.
 */
export class UpdateIacModuleDto extends PartialType(CreateIacModuleDto) {}
