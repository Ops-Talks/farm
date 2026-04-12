import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { OpaModule } from "./opa.module";
import { OpaResult } from "./entities/opa-result.entity";
import { OpaService } from "./opa.service";

/**
 * Minimal compilation test for OpaModule.
 * Uses mocked repository to verify the module wires up correctly
 * without requiring a real database connection.
 */
describe("OpaModule", () => {
  let module: TestingModule;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), OpaModule],
    })
      .overrideProvider(getRepositoryToken(OpaResult))
      .useValue(mockRepository)
      .compile();
  }, 30000);

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it("should compile the module", () => {
    expect(module).toBeDefined();
  });

  it("should provide OpaService", () => {
    const service = module.get<OpaService>(OpaService);
    expect(service).toBeDefined();
  });
});
