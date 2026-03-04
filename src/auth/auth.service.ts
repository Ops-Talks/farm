import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { createHash } from "crypto";
import { User } from "./entities/user.entity";
import { RegisterUserDto } from "./dto/register-user.dto";
import { LoginDto } from "./dto/login.dto";

type StoredUser = User & { passwordHash: string };

/**
 * Service responsible for user authentication and management.
 * Provides registration, login, and user lookup functionality.
 */
@Injectable()
export class AuthService {
  private readonly users: Map<string, StoredUser> = new Map();

  /**
   * Hashes a password using SHA-256.
   * Note: In production, use bcrypt or a similar secure hashing library.
   * @param password - The plain text password to hash
   * @returns The hashed password string
   */
  private hashPassword(password: string): string {
    return createHash("sha256").update(password).digest("hex");
  }

  /**
   * Returns a user object without the password hash.
   * @param storedUser - The stored user including the password hash
   * @returns The user without password hash
   */
  private toPublicUser(storedUser: StoredUser): User {
    return {
      id: storedUser.id,
      username: storedUser.username,
      email: storedUser.email,
      displayName: storedUser.displayName,
      roles: storedUser.roles,
      createdAt: storedUser.createdAt,
      updatedAt: storedUser.updatedAt,
    };
  }

  /**
   * Registers a new user in the system.
   * @param registerUserDto - Data for the new user
   * @returns The created user (without password)
   * @throws ConflictException if the username or email is already in use
   */
  register(registerUserDto: RegisterUserDto): User {
    const existingUser = Array.from(this.users.values()).find(
      (u) =>
        u.username === registerUserDto.username ||
        u.email === registerUserDto.email,
    );

    if (existingUser) {
      throw new ConflictException("Username or email is already in use");
    }

    const newUser: StoredUser = {
      id: randomUUID(),
      username: registerUserDto.username,
      email: registerUserDto.email,
      displayName: registerUserDto.displayName,
      roles: ["user"],
      passwordHash: this.hashPassword(registerUserDto.password),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(newUser.id, newUser);
    return this.toPublicUser(newUser);
  }

  /**
   * Validates user credentials and returns the user if valid.
   * @param loginDto - The login credentials
   * @returns The authenticated user (without password) and a session token
   * @throws UnauthorizedException if the credentials are invalid
   */
  login(loginDto: LoginDto): { user: User; token: string } {
    const storedUser = Array.from(this.users.values()).find(
      (u) => u.username === loginDto.username,
    );

    if (
      !storedUser ||
      storedUser.passwordHash !== this.hashPassword(loginDto.password)
    ) {
      throw new UnauthorizedException("Invalid username or password");
    }

    return {
      user: this.toPublicUser(storedUser),
      token: randomUUID(),
    };
  }

  /**
   * Retrieves all registered users.
   * @returns An array of all users (without passwords)
   */
  findAll(): User[] {
    return Array.from(this.users.values()).map((u) => this.toPublicUser(u));
  }

  /**
   * Retrieves a user by their ID.
   * @param id - The UUID of the user
   * @returns The user with the specified ID, or undefined if not found
   */
  findById(id: string): User | undefined {
    const stored = this.users.get(id);
    if (!stored) return undefined;
    return this.toPublicUser(stored);
  }
}
