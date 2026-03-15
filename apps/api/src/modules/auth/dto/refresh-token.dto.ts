import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Data Transfer Object for refreshing an access token.
 */
export class RefreshTokenDto {
  @ApiProperty({
    example: "john_doe",
    description: "The username associated with the refresh token",
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    example: "a1b2c3d4e5f6...",
    description: "The refresh token received during login",
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
