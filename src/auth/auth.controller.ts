import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RegisterUserDto } from "./dto/register-user.dto";
import { LoginDto } from "./dto/login.dto";
import { User } from "./entities/user.entity";
import { ErrorResponseDto } from "../common/dto/error-response.dto";

/**
 * Controller for authentication and user management operations.
 */
@ApiTags("Authentication")
@Controller("auth")
@ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: "Bad Request - Validation failed.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  description: "Internal Server Error.",
  type: ErrorResponseDto,
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Registers a new user account.
   * @param registerUserDto - Registration data
   * @returns The created user profile
   */
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "The user has been successfully registered.",
    type: User,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "User already exists.",
    type: ErrorResponseDto,
  })
  async register(@Body() registerUserDto: RegisterUserDto): Promise<User> {
    return await this.authService.register(registerUserDto);
  }

  /**
   * Authenticates a user and returns a session token.
   * @param loginDto - Login credentials
   * @returns The authenticated user and a session token
   */
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "User login" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Successfully authenticated.",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Invalid credentials.",
    type: ErrorResponseDto,
  })
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<{ user: User; token: string }> {
    return await this.authService.login(loginDto);
  }

  /**
   * Retrieves all registered users.
   * @returns An array of all user profiles
   */
  @Get("users")
  @ApiOperation({ summary: "Get all users" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Return all users.",
    type: [User],
  })
  async findAll(): Promise<User[]> {
    return await this.authService.findAll();
  }
}
