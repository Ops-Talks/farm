import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { RegisterUserDto } from "../dto/register-user.dto";

async function check(payload: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(RegisterUserDto, payload);
  const errors = await validate(dto);
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

describe("RegisterUserDto validation (Phase 37)", () => {
  it("accepts a valid payload", async () => {
    const errors = await check({
      username: "alice_01",
      email: "alice@example.com",
      password: "Strongest1",
      displayName: "Alice",
    });
    expect(errors).toEqual([]);
  });

  it("rejects username with whitespace", async () => {
    const errors = await check({
      username: "alice user",
      email: "alice@example.com",
      password: "Strongest1",
      displayName: "Alice",
    });
    expect(errors.join(" ")).toMatch(/can only contain/);
  });

  it("rejects invalid email", async () => {
    const errors = await check({
      username: "alice",
      email: "not-an-email",
      password: "Strongest1",
      displayName: "Alice",
    });
    expect(errors.join(" ")).toMatch(/email/i);
  });

  it("rejects short password", async () => {
    const errors = await check({
      username: "alice",
      email: "alice@x.com",
      password: "Sh0rt",
      displayName: "Alice",
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects password without uppercase/lowercase/digit", async () => {
    const errors = await check({
      username: "alice",
      email: "alice@x.com",
      password: "alllowercase",
      displayName: "Alice",
    });
    expect(errors.join(" ")).toMatch(/uppercase|lowercase|number/);
  });
});
