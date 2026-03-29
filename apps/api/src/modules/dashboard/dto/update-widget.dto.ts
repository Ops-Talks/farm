import { PartialType } from "@nestjs/swagger";
import { CreateWidgetDto } from "./create-widget.dto";

/**
 * DTO for updating an existing dashboard widget.
 * All fields are optional.
 */
export class UpdateWidgetDto extends PartialType(CreateWidgetDto) {}
