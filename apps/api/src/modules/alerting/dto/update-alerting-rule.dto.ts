import { PartialType } from "@nestjs/swagger";
import { CreateAlertingRuleDto } from "./create-alerting-rule.dto";

/**
 * DTO for updating an existing alerting rule.
 * All fields are optional.
 */
export class UpdateAlertingRuleDto extends PartialType(CreateAlertingRuleDto) {}
