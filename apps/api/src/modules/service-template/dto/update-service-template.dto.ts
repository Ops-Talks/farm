import { PartialType } from "@nestjs/swagger";
import { CreateServiceTemplateDto } from "./create-service-template.dto";

/**
 * DTO for updating an existing service template.
 * All fields are optional.
 */
export class UpdateServiceTemplateDto extends PartialType(
  CreateServiceTemplateDto,
) {}
