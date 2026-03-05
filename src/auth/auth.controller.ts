import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RegisterUserDto } from "./dto/register-user.dto";
import { LoginDto } from "./dto/login.dto";
import { User } from "./entities/user.entity";

/**
 * Controller for authentication and user management operations.
 */
@ApiTags("Authentication")
@Controller("auth")
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
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Invalid input." })
  register(@Body() registerUserDto: RegisterUserDto): User {
    return this.authService.register(registerUserDto);
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
  })
  login(@Body() loginDto: LoginDto): { user: User; token: string } {
    return this.authService.login(loginDto);
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
  findAll(): User[] {
    return this.authService.findAll();
  }
}
