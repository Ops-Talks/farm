import { PartialType, OmitType } from "@nestjs/swagger";
import { CreatePostMortemDto } from "./create-post-mortem.dto";

/**
 * DTO for updating an existing post-mortem.
 * All fields are optional; incidentId cannot be changed after creation.
 */
export class UpdatePostMortemDto extends PartialType(
  OmitType(CreatePostMortemDto, ["incidentId"] as const),
) {}
