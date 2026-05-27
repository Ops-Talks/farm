jest.mock("bcrypt", () => ({
  hash: jest.fn(),
}));
import * as bcrypt from "bcrypt";
import { User } from "./user.entity";
import { BCRYPT_ROUNDS } from "../../../common/constants/bcrypt";

/**
 * Unit tests for the User entity's hashPassword lifecycle hook.
 * Covers the conditional branch: hash only when the password is plain-text
 * (i.e., it is truthy and does not already start with "$2b$").
 */

describe("User entity - hashPassword", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue(
      `$2b$${BCRYPT_ROUNDS}$newhashedvalue`,
    );
  });

  it("should hash the password when it is plain-text", async () => {
    const user = new User();
    user.password = "plain-secret";

    await user.hashPassword();

    expect(bcrypt.hash).toHaveBeenCalledWith("plain-secret", BCRYPT_ROUNDS);
    expect(user.password).toBe(`$2b$${BCRYPT_ROUNDS}$newhashedvalue`);
  });

  it("should not rehash a password that already starts with $2b$", async () => {
    // Covers the branch where `this.password.startsWith("$2b$")` is true
    const user = new User();
    user.password = "$2b$10$alreadyhashed.value.here";

    await user.hashPassword();

    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(user.password).toBe("$2b$10$alreadyhashed.value.here");
  });

  it("should not hash when password is an empty string (falsy)", async () => {
    // Covers the branch where `this.password` is falsy
    const user = new User();
    user.password = "";

    await user.hashPassword();

    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it("should not hash when password is undefined", async () => {
    const user = new User();
    user.password = undefined as unknown as string;

    await user.hashPassword();

    expect(bcrypt.hash).not.toHaveBeenCalled();
  });
});
