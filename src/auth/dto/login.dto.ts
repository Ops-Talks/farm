import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Data Transfer Object for user login.
 */
export class LoginDto {
  @ApiProperty({ example: "john_doe", description: "The unique username" })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: "password123", description: "The user password" })
  @IsString()
  @IsNotEmpty()
  password: string;
}
