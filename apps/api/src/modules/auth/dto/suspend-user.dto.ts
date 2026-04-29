import { IsBoolean } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SuspendUserDto {
  @ApiProperty({ description: "Whether to suspend or unsuspend the user" })
  @IsBoolean()
  suspended: boolean;
}
