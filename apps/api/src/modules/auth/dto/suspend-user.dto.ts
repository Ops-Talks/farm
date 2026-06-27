import { IsBoolean } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SuspendUserDto {
  @ApiProperty({
    example: true,
    description: "Whether to suspend or unsuspend the user",
  })
  @IsBoolean()
  suspended: boolean;
}
