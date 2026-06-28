import { IsNotEmpty, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Data transfer object for changing the authenticated user's password.
 */
export class ChangePasswordDto {
  @ApiProperty({
    example: "OldPass1",
    description: "The user's current password",
  })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({
    minLength: 8,
    example: "NewPass1",
    description: "The new password",
  })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  newPassword: string;

  @ApiProperty({
    minLength: 8,
    example: "NewPass1",
    description: "Confirmation of the new password",
  })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  confirmPassword: string;
}
