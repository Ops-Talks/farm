import { PartialType } from "@nestjs/swagger";
import { CreateOrganizationDto } from "./create-organization.dto";

/**
 * DTO for updating an existing organization.
 * All fields from CreateOrganizationDto are optional.
 */
export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {}
