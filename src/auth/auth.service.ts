import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
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
    private readonly jwtService: JwtService,
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
   * @returns The user and a real JWT token
   * @throws UnauthorizedException if credentials are invalid
   */
  async login(loginDto: LoginDto): Promise<{ user: User; token: string }> {
    const { username, password } = loginDto;

    const user = await this.userRepository.findOne({ where: { username } });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const payload = {
      username: user.username,
      sub: user.id,
      roles: user.roles,
    };

    return {
      user,
      token: this.jwtService.sign(payload),
    };
  }

  /**
   * Validates a user for Passport strategy.
   * @param username - User's username
   * @param password - User's password
   * @returns The validated user or null
   */
  async validateUser(username: string, pass: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { username } });
    if (user && (await bcrypt.compare(pass, user.password))) {
      return user;
    }
    return null;
  }

  /**
   * Retrieves all users.
   * @returns An array of all users
   */
  async findAll(): Promise<User[]> {
    return await this.userRepository.find();
  }
}
