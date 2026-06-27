import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export enum GenderEnum {
  MALE = "male",
  FEMALE = "female",
  NON_BINARY = "non_binary",
}

/**
 * Data transfer object for updating the authenticated user's profile.
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: "John", description: "User's first name" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: "Doe", description: "User's last name" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    example: "john@example.com",
    description: "User's email address",
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    enum: GenderEnum,
    example: GenderEnum.MALE,
    description: "User's gender",
  })
  @IsOptional()
  @IsEnum(GenderEnum)
  gender?: GenderEnum;
}
