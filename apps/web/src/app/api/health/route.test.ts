import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns { status: 'ok' } with HTTP 200", async () => {
    const response = await GET();
    const data = await response.json();
    expect(data).toEqual({ status: "ok" });
  });
});
