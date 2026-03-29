import { PartialType } from "@nestjs/swagger";
import { CreateIncidentDto } from "./create-incident.dto";

/**
 * DTO for updating an existing incident.
 * All fields are optional.
 */
export class UpdateIncidentDto extends PartialType(CreateIncidentDto) {}
