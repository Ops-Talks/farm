import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("register", () => {
    it("should register a new user and return the user without password", () => {
      const user = service.register({
        username: "alice",
        email: "alice@example.com",
        password: "securepassword",
        displayName: "Alice",
      });

      expect(user.id).toBeDefined();
      expect(user.username).toBe("alice");
      expect(user.email).toBe("alice@example.com");
      expect(user.displayName).toBe("Alice");
      expect(user.roles).toEqual(["user"]);
      expect(
        (user as unknown as { passwordHash?: string }).passwordHash,
      ).toBeUndefined();
    });

    it("should throw ConflictException when registering a duplicate username", () => {
      service.register({
        username: "bob",
        email: "bob@example.com",
        password: "password123",
        displayName: "Bob",
      });

      expect(() =>
        service.register({
          username: "bob",
          email: "different@example.com",
          password: "password456",
          displayName: "Bob2",
        }),
      ).toThrow(ConflictException);
    });

    it("should throw ConflictException when registering a duplicate email", () => {
      service.register({
        username: "carol",
        email: "carol@example.com",
        password: "password123",
        displayName: "Carol",
      });

      expect(() =>
        service.register({
          username: "carol2",
          email: "carol@example.com",
          password: "password456",
          displayName: "Carol2",
        }),
      ).toThrow(ConflictException);
    });
  });

  describe("login", () => {
    beforeEach(() => {
      service.register({
        username: "dave",
        email: "dave@example.com",
        password: "mypassword",
        displayName: "Dave",
      });
    });

    it("should return user and token on valid credentials", () => {
      const result = service.login({
        username: "dave",
        password: "mypassword",
      });

      expect(result.user.username).toBe("dave");
      expect(result.token).toBeDefined();
      expect(
        (result.user as unknown as { passwordHash?: string }).passwordHash,
      ).toBeUndefined();
    });

    it("should throw UnauthorizedException for incorrect password", () => {
      expect(() =>
        service.login({ username: "dave", password: "wrongpassword" }),
      ).toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException for unknown username", () => {
      expect(() =>
        service.login({ username: "unknown", password: "anypassword" }),
      ).toThrow(UnauthorizedException);
    });
  });

  describe("findAll", () => {
    it("should return an empty array initially", () => {
      expect(service.findAll()).toEqual([]);
    });

    it("should return all registered users without passwords", () => {
      service.register({
        username: "eve",
        email: "eve@example.com",
        password: "pass1",
        displayName: "Eve",
      });
      service.register({
        username: "frank",
        email: "frank@example.com",
        password: "pass2",
        displayName: "Frank",
      });

      const users = service.findAll();
      expect(users).toHaveLength(2);
      users.forEach((u) => {
        expect(
          (u as unknown as { passwordHash?: string }).passwordHash,
        ).toBeUndefined();
      });
    });
  });

  describe("findById", () => {
    it("should return a user by ID without password", () => {
      const registered = service.register({
        username: "grace",
        email: "grace@example.com",
        password: "pass3",
        displayName: "Grace",
      });

      const found = service.findById(registered.id);
      expect(found).toBeDefined();
      expect(found?.username).toBe("grace");
      expect(
        (found as unknown as { passwordHash?: string })?.passwordHash,
      ).toBeUndefined();
    });

    it("should return undefined for unknown ID", () => {
      expect(service.findById("unknown-id")).toBeUndefined();
    });
  });
});
