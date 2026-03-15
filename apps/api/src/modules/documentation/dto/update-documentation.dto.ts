import { PartialType } from "@nestjs/swagger";
import { CreateDocumentationDto } from "./create-documentation.dto";

/**
 * Data Transfer Object for updating an existing documentation entry.
 * All fields from CreateDocumentationDto are optional.
 */
export class UpdateDocumentationDto extends PartialType(
  CreateDocumentationDto,
) {}
