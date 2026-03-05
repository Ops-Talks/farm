import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { RegisterUserDto } from "./dto/register-user.dto";
import { LoginDto } from "./dto/login.dto";

/**
 * Service handling authentication and user-related business logic.
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Registers a new user.
   * @param registerUserDto - Registration details
   * @returns The newly created user
   * @throws ConflictException if username or email already exists
   */
  async register(registerUserDto: RegisterUserDto): Promise<User> {
    const { username, email } = registerUserDto;

    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      throw new ConflictException("Username or email already exists");
    }

    const user = this.userRepository.create({
      ...registerUserDto,
      roles: ["user"],
    });

    return await this.userRepository.save(user);
  }

  /**
   * Authenticates a user.
   * @param loginDto - Login credentials
   * @returns The user and a dummy token
   * @throws UnauthorizedException if credentials are invalid
   */
  async login(loginDto: LoginDto): Promise<{ user: User; token: string }> {
    const { username, password } = loginDto;

    const user = await this.userRepository.findOne({ where: { username } });

    if (!user || user.password !== password) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return {
      user,
      token: "dummy-jwt-token",
    };
  }

  /**
   * Retrieves all users.
   * @returns An array of all users
   */
  async findAll(): Promise<User[]> {
    return await this.userRepository.find();
  }
}
