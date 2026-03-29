import { PartialType } from "@nestjs/swagger";
import { CreateDashboardDto } from "./create-dashboard.dto";

/**
 * DTO for updating an existing dashboard.
 * All fields are optional.
 */
export class UpdateDashboardDto extends PartialType(CreateDashboardDto) {}
