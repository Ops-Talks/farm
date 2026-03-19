import { PartialType } from "@nestjs/swagger";
import { CreateTagPolicyDto } from "./create-tag-policy.dto";

/**
 * DTO for partially updating an existing tag governance policy.
 * All fields from CreateTagPolicyDto are optional.
 */
export class UpdateTagPolicyDto extends PartialType(CreateTagPolicyDto) {}
